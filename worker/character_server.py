"""
캐릭터 생성 + 삽화 생성 FastAPI 서버
--------------------------------
Next.js가 이 서버를 HTTP로 호출해서 캐릭터/삽화 생성을 요청함.
- POST /generate-character   : 캐릭터 생성 시작 (즉시 응답, 백그라운드로 처리)
- POST /generate-illustration: 삽화 생성 시작 (즉시 응답, 백그라운드로 처리)
- 처리 완료되면, Next.js의 DB를 직접 업데이트하기 위해
  Next.js 쪽에 미리 정해둔 완료 API를 호출함

실행 방법:
    pip install fastapi uvicorn python-multipart requests
    python character_server.py
    (기본적으로 http://localhost:8000 에서 실행됨)

배포 시 환경변수 (Windows: set / Linux: export):
    NEXTJS_BASE_URL=https://your-app.vercel.app
    FASTAPI_PUBLIC_URL=https://xxxx.ngrok-free.app
    INTERNAL_API_KEY=...  (Vercel과 동일)
"""

import base64
import json
import os
import random
import tempfile
import time
import shutil
import traceback
import threading
from pathlib import Path
from typing import Optional

import requests
from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

app = FastAPI()
inflight_jobs: set[str] = set()
progress_lock = threading.Lock()
job_progress: dict[str, dict] = {}
job_node_totals: dict[str, int] = {}
job_callbacks: dict[str, dict] = {}

# ===== 환경 설정 (본인 환경에 맞게 수정) =====
COMFY_URL = "http://127.0.0.1:7523"
CHARACTER_WORKFLOW_PATH = "character_storybook_v1.json"
ILLUSTRATION_WORKFLOW_PATH = "storybook_illustration.json"
def _normalize_nextjs_base_url(url: str) -> str:
    """panbagi.co.kr is 308-redirected to www; prefer www to avoid callback issues."""
    base = (url or "").rstrip("/")
    if base == "https://panbagi.co.kr" or base == "http://panbagi.co.kr":
        return "https://www.panbagi.co.kr"
    return base


NEXTJS_BASE_URL = _normalize_nextjs_base_url(
    os.environ.get("NEXTJS_BASE_URL", "http://localhost:3000")
)
CHARACTER_COMPLETE_PATH = "/api/characters/{character_id}/complete"
ILLUSTRATION_COMPLETE_PATH = "/api/illustrations/{illustration_id}/complete"
INTERNAL_API_KEY = os.environ.get("INTERNAL_API_KEY", "dev-internal-key")
# ngrok URL — Vercel이 생성 이미지를 다운로드할 때 필요
FASTAPI_PUBLIC_URL = os.environ.get("FASTAPI_PUBLIC_URL", "").rstrip("/")
print(f"[설정] NEXTJS_BASE_URL={NEXTJS_BASE_URL}")
print(f"[설정] FASTAPI_PUBLIC_URL={FASTAPI_PUBLIC_URL or '(미설정 — 배포 시 필수)'}")
if not FASTAPI_PUBLIC_URL and not NEXTJS_BASE_URL.startswith(
    ("http://localhost", "http://127.0.0.1")
):
    print(
        "[경고] FASTAPI_PUBLIC_URL이 비어 있습니다. "
        "배포 환경에서는 ngrok URL을 반드시 설정하세요."
    )
# ===========================================

# 캐릭터 생성 워크플로우 노드 번호
FACE_IMAGE_NODE_ID = "326"
GENDER_STRING_NODE_ID = "631"
CHARACTER_KSAMPLER_NODE_IDS = ["576", "578"]

# 삽화 생성 워크플로우 노드 번호
ILLUST_IMAGE_NODE_ID = "190"
ILLUSTR_PROMPT_NODE_ID = "246:220"
ILLUST_SEED_NODE_ID = "246:241"

GENDER_MAP = {
    "girl": "girl,",
    "boy": "boy,",
    "female": "girl,",
    "male": "boy,",
}


class GenerateCharacterRequest(BaseModel):
    character_id: str
    image_path: str
    gender: str
    # Vercel이 generate-character 요청에 함께 넘기는 콜백 (있으면 env보다 우선)
    callback_url: Optional[str] = None
    complete_url: Optional[str] = None
    progress_url: Optional[str] = None
    api_key: Optional[str] = None
    internal_api_key: Optional[str] = None


class GenerateIllustrationRequest(BaseModel):
    illustration_id: str
    character_image_path: str
    prompt: str
    callback_url: Optional[str] = None
    complete_url: Optional[str] = None
    progress_url: Optional[str] = None
    api_key: Optional[str] = None
    internal_api_key: Optional[str] = None


class EditIllustrationExpressionRequest(BaseModel):
    illustration_id: str
    image_path: str
    expression: str
    callback_url: Optional[str] = None
    complete_url: Optional[str] = None
    progress_url: Optional[str] = None
    api_key: Optional[str] = None
    internal_api_key: Optional[str] = None


EXPRESSION_EDIT_PROMPTS = {
    "smile": (
        "Change only the child's facial expression to a big happy smile. "
        "Keep identity, hairstyle, clothes, pose, and background exactly the same. "
        "Do not change the scene."
    ),
    "surprise": (
        "Change only the child's facial expression to a surprised face with wide eyes. "
        "Keep identity, hairstyle, clothes, pose, and background exactly the same. "
        "Do not change the scene."
    ),
    "serious": (
        "Change only the child's facial expression to a serious, focused face. "
        "Keep identity, hairstyle, clothes, pose, and background exactly the same. "
        "Do not change the scene."
    ),
    "sad": (
        "Change only the child's facial expression to a sad face. "
        "Keep identity, hairstyle, clothes, pose, and background exactly the same. "
        "Do not change the scene."
    ),
    "excited": (
        "Change only the child's facial expression to an excited, delighted face. "
        "Keep identity, hairstyle, clothes, pose, and background exactly the same. "
        "Do not change the scene."
    ),
}


def is_local_nextjs() -> bool:
    return NEXTJS_BASE_URL.startswith(("http://localhost", "http://127.0.0.1"))


def resolve_api_key(explicit: Optional[str] = None) -> str:
    return (explicit or INTERNAL_API_KEY or "").strip()


def set_job_callbacks(job_key: str, **kwargs):
    job_callbacks[job_key] = kwargs


def get_job_callback(job_key: str, key: str, default=None):
    return job_callbacks.get(job_key, {}).get(key) or default


def clear_job_callbacks(job_key: str):
    job_callbacks.pop(job_key, None)


# ---------- ComfyUI 공통 연동 함수들 ----------

def materialize_image(image_path: str) -> str:
    """로컬 경로 또는 http(s) URL을 ComfyUI가 열 수 있는 임시 파일로 만든다."""
    if image_path.startswith("http://") or image_path.startswith("https://"):
        resp = requests.get(
            image_path,
            headers={"ngrok-skip-browser-warning": "true"},
            timeout=60,
        )
        resp.raise_for_status()
        suffix = Path(image_path.split("?", 1)[0]).suffix or ".png"
        handle, tmp_path = tempfile.mkstemp(suffix=suffix)
        os.close(handle)
        Path(tmp_path).write_bytes(resp.content)
        return tmp_path
    return image_path


def upload_image(image_path: str) -> str:
    """얼굴 사진이든 캐릭터 이미지든, ComfyUI에 업로드하는 공통 함수"""
    local_path = materialize_image(image_path)
    with open(local_path, "rb") as f:
        files = {"image": (Path(local_path).name, f, "image/png")}
        resp = requests.post(f"{COMFY_URL}/upload/image", files=files)
    resp.raise_for_status()
    return resp.json()["name"]


def generated_callback_path(folder: str, filename: str, local_path: Path) -> str:
    """Next.js에 넘길 imagePath. 로컬 개발은 파일 경로, 배포는 ngrok 공개 URL."""
    if is_local_nextjs():
        return str(local_path)

    if FASTAPI_PUBLIC_URL:
        if folder == "generated_characters":
            return f"{FASTAPI_PUBLIC_URL}/generated_characters/{filename}"
        return f"{FASTAPI_PUBLIC_URL}/generated_illustrations/{filename}"

    print(
        "[경고] FASTAPI_PUBLIC_URL 미설정 → 로컬 경로를 넘깁니다. "
        "Vercel은 PC 경로를 읽을 수 없으니 base64 폴백을 사용합니다."
    )
    return str(local_path)


def image_payload_for_nextjs(local_path: Path, public_path: str) -> tuple[Optional[str], Optional[str]]:
    """
    Vercel이 읽을 수 있는 imagePath URL 또는 image_base64 반환.
    (image_path, image_base64) — 하나만 설정
    """
    if public_path.startswith("http://") or public_path.startswith("https://"):
        return public_path, None

    if is_local_nextjs():
        return public_path, None

    try:
        encoded = base64.b64encode(local_path.read_bytes()).decode("ascii")
        return None, encoded
    except Exception as error:
        print(f"[경고] base64 인코딩 실패: {error}")
        return public_path, None


def safe_generated_file(folder: str, filename: str) -> Path:
    if "/" in filename or "\\" in filename or ".." in filename:
        raise HTTPException(status_code=400, detail="invalid filename")
    directory = Path(folder).resolve()
    path = directory / filename
    if path.parent != directory or not path.is_file():
        raise HTTPException(status_code=404, detail="not found")
    return path


def load_workflow(json_path: str) -> dict:
    with open(json_path, "r", encoding="utf-8") as f:
        return json.load(f)


def build_character_prompt(workflow: dict, uploaded_filename: str, gender: str) -> tuple[dict, int]:
    prompt = json.loads(json.dumps(workflow))

    prompt[FACE_IMAGE_NODE_ID]["inputs"]["image"] = uploaded_filename

    gender_desc = GENDER_MAP.get(gender.lower(), gender)
    prompt[GENDER_STRING_NODE_ID]["inputs"]["string"] = gender_desc

    seed = int(prompt[CHARACTER_KSAMPLER_NODE_IDS[0]]["inputs"]["seed"])
    return prompt, seed


def run_illustration_pass(
    image_path: str,
    text_prompt: str,
    save_path: str,
    job_key: str | None = None,
) -> int:
    if job_key:
        set_job_progress(job_key, 8, "이미지 업로드 중")
    uploaded_name = upload_image(image_path)
    workflow = load_workflow(ILLUSTRATION_WORKFLOW_PATH)
    prompt, seed = build_illustration_prompt(workflow, uploaded_name, text_prompt)
    if job_key:
        set_job_progress(job_key, 12, "작업 등록 중")
    prompt_id = queue_prompt(prompt)
    result = wait_for_result(prompt_id, job_key=job_key)
    if job_key:
        set_job_progress(job_key, 92, "결과 저장 중")
    download_output_image(result, save_path)
    return seed


def build_illustration_prompt(workflow: dict, uploaded_filename: str, scene_prompt: str) -> tuple[dict, int]:
    prompt = json.loads(json.dumps(workflow))

    prompt[ILLUST_IMAGE_NODE_ID]["inputs"]["image"] = uploaded_filename
    prompt[ILLUST_PROMPT_NODE_ID]["inputs"]["text"] = scene_prompt

    new_seed = random.randint(0, 2**32 - 1)
    prompt[ILLUST_SEED_NODE_ID]["inputs"]["seed"] = new_seed

    return prompt, new_seed


def queue_prompt(prompt: dict) -> str:
    payload = {"prompt": prompt}
    resp = requests.post(f"{COMFY_URL}/prompt", json=payload)
    resp.raise_for_status()
    return resp.json()["prompt_id"]


def set_job_progress(job_key: str, percent: int, label: str, reset: bool = False):
    with progress_lock:
        previous = 0 if reset else job_progress.get(job_key, {}).get("percent", 0)
        next_percent = max(previous, min(99, int(percent)))
        job_progress[job_key] = {
            "percent": next_percent,
            "label": label,
        }
    _schedule_progress_notify(job_key, next_percent, label)


_last_progress_post: dict[str, tuple[int, float]] = {}


def _schedule_progress_notify(job_key: str, percent: int, label: str):
    now = time.time()
    previous = _last_progress_post.get(job_key)
    if previous and previous[0] == percent and now - previous[1] < 1.2:
        return
    _last_progress_post[job_key] = (percent, now)
    threading.Thread(
        target=_post_progress_to_nextjs,
        args=(job_key, percent, label),
        daemon=True,
    ).start()


def _post_progress_to_nextjs(job_key: str, percent: int, label: str):
    if ":" not in job_key:
        return
    kind, entity_id = job_key.split(":", 1)
    url = get_job_callback(job_key, "progress_url") or f"{NEXTJS_BASE_URL}/api/generation-progress"
    api_key = resolve_api_key(get_job_callback(job_key, "api_key"))
    try:
        headers = {"x-api-key": api_key} if api_key else {}
        requests.post(
            url,
            json={
                "kind": kind,
                "id": entity_id,
                "percent": percent,
                "label": label,
            },
            headers=headers,
            timeout=3,
        )
    except Exception as error:
        print(f"[경고] 진행률 알림 실패 (job={job_key}, url={url}): {error}")


def clear_job_progress(job_key: str):
    with progress_lock:
        job_progress.pop(job_key, None)
    job_node_totals.pop(job_key, None)


def update_progress_from_queue(prompt_id: str, job_key: str):
    try:
        data = requests.get(f"{COMFY_URL}/queue", timeout=5).json()
    except Exception:
        return

    pending = data.get("queue_pending") or []
    running = data.get("queue_running") or []

    for item in pending:
        if len(item) > 1 and str(item[1]) == prompt_id:
            set_job_progress(job_key, 12, "대기열에서 기다리는 중")
            return

    for item in running:
        if len(item) > 1 and str(item[1]) == prompt_id:
            remaining = item[4] if len(item) > 4 else []
            remaining_n = len(remaining) if isinstance(remaining, list) else 0
            current_total = job_node_totals.get(prompt_id, 0)
            if remaining_n > current_total:
                job_node_totals[prompt_id] = remaining_n
                current_total = remaining_n
            total = current_total or 1
            ratio = 1 - (remaining_n / total)
            percent = 15 + int(ratio * 70)
            set_job_progress(job_key, percent, "이미지 생성 중")
            return


def start_sampler_watcher(prompt_id: str, job_key: str) -> threading.Event:
    stop = threading.Event()
    thread = threading.Thread(
        target=_watch_comfy_ws,
        args=(prompt_id, job_key, stop),
        daemon=True,
    )
    thread.start()
    return stop


def _watch_comfy_ws(prompt_id: str, job_key: str, stop: threading.Event):
    try:
        import websocket
    except ImportError:
        return

    client_id = str(random.randint(1, 10**12))
    ws_url = (
        COMFY_URL.replace("https://", "wss://").replace("http://", "ws://")
        + f"/ws?clientId={client_id}"
    )
    try:
        ws = websocket.create_connection(ws_url, timeout=5)
        ws.settimeout(1)
    except Exception:
        return

    try:
        while not stop.is_set():
            try:
                raw = ws.recv()
            except Exception:
                continue
            if not isinstance(raw, str):
                continue
            try:
                message = json.loads(raw)
            except Exception:
                continue
            if message.get("type") != "progress":
                continue
            data = message.get("data") or {}
            message_prompt_id = data.get("prompt_id")
            if message_prompt_id and str(message_prompt_id) != prompt_id:
                continue
            value = data.get("value") or 0
            maximum = data.get("max") or 0
            if maximum <= 0:
                continue
            percent = 18 + int(70 * (float(value) / float(maximum)))
            set_job_progress(job_key, percent, "이미지 생성 중")
    finally:
        try:
            ws.close()
        except Exception:
            pass


def wait_for_result(prompt_id: str, timeout_sec: int = 300, job_key: str | None = None) -> dict:
    start = time.time()
    stop_watch = start_sampler_watcher(prompt_id, job_key) if job_key else None
    try:
        while time.time() - start < timeout_sec:
            if job_key:
                elapsed = time.time() - start
                estimated = 12 + int(min(78, (elapsed / 40.0) * 78))
                set_job_progress(job_key, estimated, "이미지 생성 중")
                update_progress_from_queue(prompt_id, job_key)

            resp = requests.get(f"{COMFY_URL}/history/{prompt_id}")
            resp.raise_for_status()
            history = resp.json()
            entry = history.get(prompt_id)
            if entry:
                status = entry.get("status") or {}
                messages = status.get("messages") or []
                interrupted = any(
                    isinstance(item, (list, tuple)) and item and item[0] == "execution_interrupted"
                    for item in messages
                )
                outputs = entry.get("outputs") or {}
                has_images = any(
                    isinstance(node, dict) and node.get("images")
                    for node in outputs.values()
                )

                if interrupted:
                    raise RuntimeError("ComfyUI에서 생성이 중단되었습니다.")

                if status.get("status_str") == "error" and status.get("completed"):
                    raise RuntimeError(f"ComfyUI 생성 실패: {messages[-1:]}")

                if status.get("completed") or has_images:
                    if not has_images:
                        raise ValueError(
                            f"결과에서 이미지를 찾을 수 없습니다. outputs={list(outputs.keys())}"
                        )
                    return entry
            time.sleep(1)
        raise TimeoutError("이미지 생성이 제한 시간 내에 끝나지 않았습니다.")
    finally:
        if stop_watch:
            stop_watch.set()


def download_output_image(history_data: dict, save_path: str):
    outputs = history_data["outputs"]
    last_image = None
    for node_id, node_output in outputs.items():
        if "images" in node_output:
            for img in node_output["images"]:
                last_image = img

    if last_image is None:
        raise ValueError("결과에서 이미지를 찾을 수 없습니다.")

    params = {
        "filename": last_image["filename"],
        "subfolder": last_image.get("subfolder", ""),
        "type": last_image.get("type", "output"),
    }
    resp = requests.get(f"{COMFY_URL}/view", params=params)
    resp.raise_for_status()
    with open(save_path, "wb") as f:
        f.write(resp.content)


# ---------- Next.js에 완료 알림 ----------

def notify_nextjs(
    callback_path_template: str,
    id_key: str,
    entity_id: str,
    success: bool,
    image_path: Optional[str] = None,
    image_base64: Optional[str] = None,
    seed: Optional[int] = None,
    error_message: Optional[str] = None,
    kind: Optional[str] = None,
    callback_url: Optional[str] = None,
    api_key: Optional[str] = None,
):
    """
    캐릭터/삽화 공통으로 쓰는 완료 알림 함수.
    callback_url이 있으면 요청 body 값을 우선 사용 (Vercel 배포 URL 자동 반영).
    """
    url = callback_url or f"{NEXTJS_BASE_URL}{callback_path_template.format(**{id_key: entity_id})}"

    payload: dict = {"success": success}
    if success:
        if image_base64:
            payload["image_base64"] = image_base64
        elif image_path:
            payload["imagePath"] = image_path
        if seed is not None:
            payload["seed"] = seed
    else:
        payload["errorMessage"] = error_message or "generation failed"
    if kind:
        payload["kind"] = kind

    headers: dict[str, str] = {}
    resolved_key = resolve_api_key(api_key)
    if resolved_key:
        headers["x-api-key"] = resolved_key

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=60)
        print(f"[알림] {url} -> 상태코드 {resp.status_code} body={resp.text[:300]}")
        if resp.status_code >= 400:
            print(f"[경고] Next.js 완료 콜백 실패 (id={entity_id}): {resp.text[:500]}")
    except Exception as e:
        print(f"[경고] Next.js 콜백 실패 (id={entity_id}, url={url}): {e}")


# ---------- 백그라운드 처리: 캐릭터 ----------

def process_character_generation(character_id: str, image_path: str, gender: str):
    job_key = f"character:{character_id}"
    try:
        set_job_progress(job_key, 5, "사진 업로드 중", reset=True)
        print(f"[캐릭터:{character_id}] 1. 얼굴 사진 업로드 중...")
        uploaded_name = upload_image(image_path)

        set_job_progress(job_key, 10, "작업 준비 중")
        print(f"[캐릭터:{character_id}] 2. 워크플로우 준비 중...")
        workflow = load_workflow(CHARACTER_WORKFLOW_PATH)
        prompt, seed = build_character_prompt(workflow, uploaded_name, gender)

        set_job_progress(job_key, 12, "작업 등록 중")
        print(f"[캐릭터:{character_id}] 3. 생성 작업 큐에 등록 중...")
        prompt_id = queue_prompt(prompt)

        print(f"[캐릭터:{character_id}] 4. 생성 완료 대기 중...")
        result = wait_for_result(prompt_id, job_key=job_key)

        set_job_progress(job_key, 92, "결과 저장 중")
        print(f"[캐릭터:{character_id}] 5. 결과 이미지 다운로드 중...")
        output_dir = Path("generated_characters").resolve()
        output_dir.mkdir(exist_ok=True)
        output_path = output_dir / f"{character_id}.png"
        download_output_image(result, str(output_path))

        set_job_progress(job_key, 97, "완료 처리 중")
        print(f"[캐릭터:{character_id}] 완료! -> {output_path}")

        public_path = generated_callback_path(
            "generated_characters", output_path.name, output_path
        )
        img_path, img_b64 = image_payload_for_nextjs(output_path, public_path)

        notify_nextjs(
            CHARACTER_COMPLETE_PATH,
            "character_id",
            character_id,
            success=True,
            image_path=img_path,
            image_base64=img_b64,
            seed=seed,
            callback_url=get_job_callback(job_key, "callback_url"),
            api_key=get_job_callback(job_key, "api_key"),
        )

    except Exception as e:
        print(f"[캐릭터:{character_id}] 에러 발생: {e}")
        traceback.print_exc()
        notify_nextjs(
            CHARACTER_COMPLETE_PATH,
            "character_id",
            character_id,
            success=False,
            error_message=str(e),
            callback_url=get_job_callback(job_key, "callback_url"),
            api_key=get_job_callback(job_key, "api_key"),
        )
    finally:
        inflight_jobs.discard(job_key)
        clear_job_progress(job_key)
        clear_job_callbacks(job_key)


# ---------- 백그라운드 처리: 삽화 ----------

def process_illustration_generation(
    illustration_id: str,
    character_image_path: str,
    scene_prompt: str,
):
    job_key = f"illustration:{illustration_id}"
    try:
        output_dir = Path("generated_illustrations").resolve()
        output_dir.mkdir(exist_ok=True)
        output_path = output_dir / f"{illustration_id}.png"

        set_job_progress(job_key, 5, "장면 생성 준비 중", reset=True)
        print(f"[삽화:{illustration_id}] 1. 장면 생성 중...")
        seed = run_illustration_pass(
            character_image_path,
            scene_prompt,
            str(output_path),
            job_key=job_key,
        )
        set_job_progress(job_key, 97, "완료 처리 중")
        print(f"[삽화:{illustration_id}] 완료! -> {output_path}")

        public_path = generated_callback_path(
            "generated_illustrations", output_path.name, output_path
        )
        img_path, img_b64 = image_payload_for_nextjs(output_path, public_path)

        notify_nextjs(
            ILLUSTRATION_COMPLETE_PATH,
            "illustration_id",
            illustration_id,
            success=True,
            image_path=img_path,
            image_base64=img_b64,
            seed=seed,
            kind="scene",
            callback_url=get_job_callback(job_key, "callback_url"),
            api_key=get_job_callback(job_key, "api_key"),
        )
    except Exception as e:
        print(f"[삽화:{illustration_id}] 에러 발생: {e}")
        traceback.print_exc()
        notify_nextjs(
            ILLUSTRATION_COMPLETE_PATH,
            "illustration_id",
            illustration_id,
            success=False,
            error_message=str(e),
            callback_url=get_job_callback(job_key, "callback_url"),
            api_key=get_job_callback(job_key, "api_key"),
        )
    finally:
        inflight_jobs.discard(job_key)
        clear_job_progress(job_key)
        clear_job_callbacks(job_key)


def process_illustration_expression_edit(
    illustration_id: str,
    image_path: str,
    expression: str,
):
    job_key = f"illustration:{illustration_id}"
    try:
        edit_prompt = EXPRESSION_EDIT_PROMPTS.get((expression or "").strip().lower())
        if not edit_prompt:
            raise ValueError(f"지원하지 않는 표정입니다: {expression}")

        output_dir = Path("generated_illustrations").resolve()
        output_dir.mkdir(exist_ok=True)
        output_path = output_dir / f"{illustration_id}.png"

        set_job_progress(job_key, 5, "표정 변경 준비 중", reset=True)
        print(f"[삽화:{illustration_id}] 표정 변경 중 ({expression})...")
        seed = run_illustration_pass(
            image_path,
            edit_prompt,
            str(output_path),
            job_key=job_key,
        )
        set_job_progress(job_key, 97, "완료 처리 중")
        print(f"[삽화:{illustration_id}] 표정 변경 완료 -> {output_path}")

        public_path = generated_callback_path(
            "generated_illustrations", output_path.name, output_path
        )
        img_path, img_b64 = image_payload_for_nextjs(output_path, public_path)

        notify_nextjs(
            ILLUSTRATION_COMPLETE_PATH,
            "illustration_id",
            illustration_id,
            success=True,
            image_path=img_path,
            image_base64=img_b64,
            seed=seed,
            kind="expression",
            callback_url=get_job_callback(job_key, "callback_url"),
            api_key=get_job_callback(job_key, "api_key"),
        )
    except Exception as e:
        print(f"[삽화:{illustration_id}] 표정 변경 에러: {e}")
        traceback.print_exc()
        notify_nextjs(
            ILLUSTRATION_COMPLETE_PATH,
            "illustration_id",
            illustration_id,
            success=False,
            error_message=str(e),
            callback_url=get_job_callback(job_key, "callback_url"),
            api_key=get_job_callback(job_key, "api_key"),
        )
    finally:
        inflight_jobs.discard(job_key)
        clear_job_progress(job_key)
        clear_job_callbacks(job_key)


def register_job_callbacks_from_request(job_key: str, req) -> None:
    callback_url = getattr(req, "callback_url", None) or getattr(req, "complete_url", None)
    if callback_url:
        # Rewrite apex → www for this deployment
        callback_url = callback_url.replace(
            "https://panbagi.co.kr/", "https://www.panbagi.co.kr/"
        ).replace("http://panbagi.co.kr/", "https://www.panbagi.co.kr/")
    progress_url = getattr(req, "progress_url", None)
    if progress_url:
        progress_url = progress_url.replace(
            "https://panbagi.co.kr/", "https://www.panbagi.co.kr/"
        ).replace("http://panbagi.co.kr/", "https://www.panbagi.co.kr/")
    api_key = resolve_api_key(
        getattr(req, "api_key", None) or getattr(req, "internal_api_key", None)
    )
    set_job_callbacks(
        job_key,
        callback_url=callback_url,
        progress_url=progress_url,
        api_key=api_key,
    )
    if callback_url:
        print(f"[콜백] {job_key} complete -> {callback_url}")


# ---------- API 엔드포인트 ----------

@app.post("/generate-character")
async def generate_character(req: GenerateCharacterRequest, background_tasks: BackgroundTasks):
    """
    생성 요청을 받으면 즉시 202 응답을 반환하고,
    실제 생성 작업은 백그라운드에서 진행함.
    """
    job_key = f"character:{req.character_id}"
    if job_key in inflight_jobs:
        return {"status": "already_queued", "character_id": req.character_id}

    inflight_jobs.add(job_key)
    register_job_callbacks_from_request(job_key, req)
    set_job_progress(job_key, 3, "준비 중", reset=True)
    background_tasks.add_task(
        process_character_generation,
        req.character_id,
        req.image_path,
        req.gender,
    )
    return {"status": "accepted", "character_id": req.character_id}


@app.post("/generate-illustration")
async def generate_illustration(req: GenerateIllustrationRequest, background_tasks: BackgroundTasks):
    """
    삽화 생성 요청을 받으면 즉시 202 응답을 반환하고,
    실제 생성 작업은 백그라운드에서 진행함.
    """
    job_key = f"illustration:{req.illustration_id}"
    if job_key in inflight_jobs:
        return {"status": "already_queued", "illustration_id": req.illustration_id}

    inflight_jobs.add(job_key)
    register_job_callbacks_from_request(job_key, req)
    set_job_progress(job_key, 3, "준비 중", reset=True)
    background_tasks.add_task(
        process_illustration_generation,
        req.illustration_id,
        req.character_image_path,
        req.prompt,
    )
    return {"status": "accepted", "illustration_id": req.illustration_id}


@app.post("/edit-illustration-expression")
async def edit_illustration_expression(
    req: EditIllustrationExpressionRequest,
    background_tasks: BackgroundTasks,
):
    job_key = f"illustration:{req.illustration_id}"
    if job_key in inflight_jobs:
        return {"status": "already_queued", "illustration_id": req.illustration_id}

    inflight_jobs.add(job_key)
    register_job_callbacks_from_request(job_key, req)
    set_job_progress(job_key, 3, "준비 중", reset=True)
    background_tasks.add_task(
        process_illustration_expression_edit,
        req.illustration_id,
        req.image_path,
        req.expression,
    )
    return {"status": "accepted", "illustration_id": req.illustration_id}


@app.get("/generated_characters/{filename}")
async def get_generated_character(filename: str):
    return FileResponse(safe_generated_file("generated_characters", filename), media_type="image/png")


@app.get("/generated_illustrations/{filename}")
async def get_generated_illustration(filename: str):
    return FileResponse(safe_generated_file("generated_illustrations", filename), media_type="image/png")


@app.get("/jobs/{kind}/{entity_id}/progress")
async def get_job_progress(kind: str, entity_id: str):
    if kind not in ("character", "illustration"):
        raise HTTPException(status_code=400, detail="invalid kind")

    job_key = f"{kind}:{entity_id}"
    with progress_lock:
        data = job_progress.get(job_key)

    if data:
        return {**data, "active": True}

    if job_key in inflight_jobs:
        return {"percent": 5, "label": "준비 중", "active": True}

    return {"percent": 0, "label": None, "active": False}


@app.get("/health")
async def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
