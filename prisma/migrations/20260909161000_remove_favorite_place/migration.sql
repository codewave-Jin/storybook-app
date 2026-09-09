UPDATE "StorybookTemplate"
SET "customFields" = '[
  {
    "key": "favorite_color",
    "label": "좋아하는 색깔은 무엇인가요?",
    "type": "choice",
    "required": true,
    "options": [
      {"value":"빨강","label":"빨강","emoji":"🔴"},
      {"value":"노랑","label":"노랑","emoji":"🟡"},
      {"value":"초록","label":"초록","emoji":"🟢"},
      {"value":"파랑","label":"파랑","emoji":"🔵"},
      {"value":"분홍","label":"분홍","emoji":"💗"},
      {"value":"보라","label":"보라","emoji":"🟣"}
    ]
  },
  {
    "key": "favorite_animal",
    "label": "좋아하는 동물 친구는 누구인가요?",
    "type": "choice",
    "required": true,
    "options": [
      {"value":"토끼","label":"토끼","emoji":"🐰"},
      {"value":"곰","label":"곰","emoji":"🐻"},
      {"value":"강아지","label":"강아지","emoji":"🐶"},
      {"value":"고양이","label":"고양이","emoji":"🐱"},
      {"value":"코끼리","label":"코끼리","emoji":"🐘"},
      {"value":"기린","label":"기린","emoji":"🦒"}
    ]
  }
]'::jsonb
WHERE title IN ('숲속 친구들과 생일파티', '숲속 친구들과의 하루');

DELETE FROM "TemplateQuestion"
WHERE key = 'favorite_place'
  AND "storybookTemplateId" IN (
    SELECT id
    FROM "StorybookTemplate"
    WHERE title IN ('숲속 친구들과 생일파티', '숲속 친구들과의 하루')
  );
