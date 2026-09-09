UPDATE "StorybookTemplate"
SET
  title = '두근두근 생일 파티',
  description = '생일파티에서 좋아하는 색깔과 동물 친구를 담는 1~3세 동화책'
WHERE title IN (
  '두근두근 생일 파티',
  '숲속 친구들과 생일파티',
  '숲속 친구들과의 하루'
);

INSERT INTO "PageTemplate" (
  id,
  "storybookTemplateId",
  "pageNumber",
  "pageType",
  "promptTemplate",
  "characterSlots",
  "expressionHint",
  "createdAt",
  "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  t.id,
  v."pageNumber",
  v."pageType"::"IllustrationPageType",
  v."promptTemplate",
  v."characterSlots",
  v."expressionHint",
  NOW(),
  NOW()
FROM "StorybookTemplate" AS t
CROSS JOIN (
  VALUES
    (1, 'COVER', 1, '정사각형 표지. {{character_1}}가 가운데 있고, 좋아하는 색깔 {{answer.favorite_color}} 풍선이 있다. 그림 안에 제목은 "{{character_1}}의 두근두근 생일 파티"라고 표지답게 예쁘게 넣어줘. 다른 사람은 넣지 마세요.', NULL),
    (2, 'PAGE', 1, '햇살이 들어오는 아이 방에 생일을 알리는 작은 장식과 달력, 풍선이 보인다. {{character_1}}가 잠에서 막 깨어나는 모습으로 시작한다. 좋아하는 동물이나 다른 사람은 넣지 마세요.', NULL),
    (3, 'PAGE', 2, '생일파티 공간을 꾸미는 장면. 여러 색깔 장식 가운데 좋아하는 색깔 {{answer.favorite_color}} 풍선과 장식이 조금 더 많다. {{character_1}}가 꾸미고 있다. 추가 등장인물이 있으면 {{character_2}}도 함께 장식을 준비한다. 좋아하는 동물은 넣지 마세요.', NULL),
    (4, 'PAGE', 1, '현관문이 열리고 {{answer.favorite_animal}}이(가) 작은 선물을 들고 찾아온다. {{character_1}}와 {{answer.favorite_animal}}의 첫 만남에 집중한다. 엄마, 아빠, 다른 사람은 넣지 마세요.', NULL),
    (5, 'PAGE', 0, '사람을 전혀 그리지 마세요. 얼굴, 손, 아이, 어른, 동물 캐릭터도 넣지 마세요. 커다란 선물상자를 중심으로, 리본이 풀리며 상자가 열리는 순간이다. 리본은 좋아하는 색깔 {{answer.favorite_color}}이다. 상자 안에는 다음 장면에서 쓸 공이 살짝 보인다.', NULL),
    (6, 'PAGE', 1, '{{character_1}}와 {{answer.favorite_animal}}이(가) 함께 공을 굴리며 논다. 공은 좋아하는 색깔 {{answer.favorite_color}}이다. 엄마, 아빠, 다른 사람은 넣지 마세요.', NULL),
    (7, 'PAGE', 0, '사람을 전혀 그리지 마세요. 얼굴, 손, 아이, 어른, 동물 캐릭터도 넣지 마세요. 파티 테이블 위 생일 케이크를 크게 보여 준다. 접시, 파티 모자, 작은 장식이 주변에 있다. 케이크가 장면의 주인공이다. 좋아하는 색깔을 굳이 강조하지 마세요.', NULL),
    (8, 'PAGE', 2, '{{character_1}}가 케이크 촛불을 끄는 장면. {{answer.favorite_animal}}이(가) 옆에서 박수를 치며 축하한다. 추가 등장인물이 있으면 {{character_2}}도 함께 박수를 친다.', NULL),
    (9, 'PAGE', 2, '파티가 끝나가는 따뜻한 풍경을 넓게 보여 준다. {{character_1}}를 너무 크게 클로즈업하지 말고, 생일파티 전체 풍경이 보이게. {{answer.favorite_animal}}은 {{character_1}} 가까이에 있을 수 있다. 추가 등장인물이 있으면 {{character_2}}도 함께 있다. 앞에서 나온 풍선, 선물상자, 공, 케이크가 주변에 자연스럽게 남아 있다.', NULL)
) AS v("pageNumber", "pageType", "characterSlots", "promptTemplate", "expressionHint")
WHERE t.title IN (
  '두근두근 생일 파티',
  '숲속 친구들과 생일파티',
  '숲속 친구들과의 하루'
)
  AND NOT EXISTS (
    SELECT 1
    FROM "PageTemplate" AS p
    WHERE p."storybookTemplateId" = t.id
      AND p."pageNumber" = v."pageNumber"
  );

UPDATE "PageTemplate" AS p
SET
  "pageType" = v."pageType"::"IllustrationPageType",
  "characterSlots" = v."characterSlots",
  "promptTemplate" = v."promptTemplate",
  "expressionHint" = v."expressionHint"
FROM "StorybookTemplate" AS t,
LATERAL (
  SELECT *
  FROM (
    VALUES
      (1, 'COVER', 1, '정사각형 표지. {{character_1}}가 가운데 있고, 좋아하는 색깔 {{answer.favorite_color}} 풍선이 있다. 그림 안에 제목은 "{{character_1}}의 두근두근 생일 파티"라고 표지답게 예쁘게 넣어줘. 다른 사람은 넣지 마세요.', NULL),
      (2, 'PAGE', 1, '햇살이 들어오는 아이 방에 생일을 알리는 작은 장식과 달력, 풍선이 보인다. {{character_1}}가 잠에서 막 깨어나는 모습으로 시작한다. 좋아하는 동물이나 다른 사람은 넣지 마세요.', NULL),
      (3, 'PAGE', 2, '생일파티 공간을 꾸미는 장면. 여러 색깔 장식 가운데 좋아하는 색깔 {{answer.favorite_color}} 풍선과 장식이 조금 더 많다. {{character_1}}가 꾸미고 있다. 추가 등장인물이 있으면 {{character_2}}도 함께 장식을 준비한다. 좋아하는 동물은 넣지 마세요.', NULL),
      (4, 'PAGE', 1, '현관문이 열리고 {{answer.favorite_animal}}이(가) 작은 선물을 들고 찾아온다. {{character_1}}와 {{answer.favorite_animal}}의 첫 만남에 집중한다. 엄마, 아빠, 다른 사람은 넣지 마세요.', NULL),
      (5, 'PAGE', 0, '사람을 전혀 그리지 마세요. 얼굴, 손, 아이, 어른, 동물 캐릭터도 넣지 마세요. 커다란 선물상자를 중심으로, 리본이 풀리며 상자가 열리는 순간이다. 리본은 좋아하는 색깔 {{answer.favorite_color}}이다. 상자 안에는 다음 장면에서 쓸 공이 살짝 보인다.', NULL),
      (6, 'PAGE', 1, '{{character_1}}와 {{answer.favorite_animal}}이(가) 함께 공을 굴리며 논다. 공은 좋아하는 색깔 {{answer.favorite_color}}이다. 엄마, 아빠, 다른 사람은 넣지 마세요.', NULL),
      (7, 'PAGE', 0, '사람을 전혀 그리지 마세요. 얼굴, 손, 아이, 어른, 동물 캐릭터도 넣지 마세요. 파티 테이블 위 생일 케이크를 크게 보여 준다. 접시, 파티 모자, 작은 장식이 주변에 있다. 케이크가 장면의 주인공이다. 좋아하는 색깔을 굳이 강조하지 마세요.', NULL),
      (8, 'PAGE', 2, '{{character_1}}가 케이크 촛불을 끄는 장면. {{answer.favorite_animal}}이(가) 옆에서 박수를 치며 축하한다. 추가 등장인물이 있으면 {{character_2}}도 함께 박수를 친다.', NULL),
      (9, 'PAGE', 2, '파티가 끝나가는 따뜻한 풍경을 넓게 보여 준다. {{character_1}}를 너무 크게 클로즈업하지 말고, 생일파티 전체 풍경이 보이게. {{answer.favorite_animal}}은 {{character_1}} 가까이에 있을 수 있다. 추가 등장인물이 있으면 {{character_2}}도 함께 있다. 앞에서 나온 풍선, 선물상자, 공, 케이크가 주변에 자연스럽게 남아 있다.', NULL)
  ) AS v("pageNumber", "pageType", "characterSlots", "promptTemplate", "expressionHint")
) AS v
WHERE p."storybookTemplateId" = t.id
  AND t.title IN (
    '두근두근 생일 파티',
    '숲속 친구들과 생일파티',
    '숲속 친구들과의 하루'
  )
  AND p."pageNumber" = v."pageNumber";

DELETE FROM "PageTemplate"
WHERE "pageNumber" > 9
  AND "storybookTemplateId" IN (
    SELECT id
    FROM "StorybookTemplate"
    WHERE title IN (
      '두근두근 생일 파티',
      '숲속 친구들과 생일파티',
      '숲속 친구들과의 하루'
    )
  );
