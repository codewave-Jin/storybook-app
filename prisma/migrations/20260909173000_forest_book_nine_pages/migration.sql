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
  9,
  'PAGE',
  '따뜻한 이불 속에서 {{character_1}}이(가) 미소 지으며 잠들고, 꿈속에 {{answer.favorite_animal}}과(와) 숲속 생일파티를 다시 거닌다.',
  1,
  NULL,
  NOW(),
  NOW()
FROM "StorybookTemplate" AS t
WHERE t.title IN ('숲속 친구들과 생일파티', '숲속 친구들과의 하루')
  AND NOT EXISTS (
    SELECT 1
    FROM "PageTemplate" AS p
    WHERE p."storybookTemplateId" = t.id
      AND p."pageNumber" = 9
  );

UPDATE "PageTemplate" AS p
SET
  "promptTemplate" = '집으로 돌아가는 길에 {{character_1}}이(가) 주운 {{answer.favorite_color}} 돌을 주머니에 넣고, 오늘 만난 {{answer.favorite_animal}}에게 작별 인사를 한다.',
  "characterSlots" = 1,
  "expressionHint" = NULL
FROM "StorybookTemplate" AS t
WHERE p."storybookTemplateId" = t.id
  AND t.title IN ('숲속 친구들과 생일파티', '숲속 친구들과의 하루')
  AND p."pageNumber" = 8;
