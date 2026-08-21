import { readFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { getAdminOrNull } from "@/lib/admin";

export async function POST(request: Request) {
  const admin = await getAdminOrNull();
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let koreanInput = "";
  try {
    const body = (await request.json()) as { koreanInput?: unknown };
    koreanInput =
      typeof body.koreanInput === "string" ? body.koreanInput.trim() : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!koreanInput) {
    return NextResponse.json(
      { error: "한글 장면 설명을 입력해 주세요." },
      { status: 400 },
    );
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  try {
    const systemPrompt = await readFile(
      path.join(process.cwd(), "src/lib/storybook_prompt_persona.md"),
      "utf8",
    );

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: koreanInput },
      ],
    });

    const prompt = completion.choices[0]?.message?.content?.trim();
    if (!prompt) {
      return NextResponse.json(
        { error: "영어 프롬프트를 만들지 못했습니다." },
        { status: 500 },
      );
    }

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error("[translate-prompt]", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "프롬프트 변환에 실패했습니다.",
      },
      { status: 500 },
    );
  }
}
