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
  },
  {
    "key": "favorite_place",
    "label": "가고 싶은 곳은 어디인가요?",
    "type": "choice",
    "required": false,
    "options": [
      {"value":"바닷가","label":"바닷가","emoji":"🏖️"},
      {"value":"놀이터","label":"놀이터","emoji":"🎠"},
      {"value":"꽃밭","label":"꽃밭","emoji":"🌸"},
      {"value":"시냇가","label":"시냇가","emoji":"🏞️"},
      {"value":"나무집","label":"나무집","emoji":"🏠"},
      {"value":"언덕","label":"언덕","emoji":"🌄"}
    ]
  }
]'::jsonb
WHERE title IN ('숲속 친구들과 생일파티', '숲속 친구들과의 하루');

UPDATE "TemplateQuestion" AS q
SET
  label = updated.label,
  "answerType" = 'choice'
FROM "StorybookTemplate" AS t,
LATERAL (
  SELECT *
  FROM (
    VALUES
      ('favorite_color', '좋아하는 색깔은 무엇인가요?'),
      ('favorite_animal', '좋아하는 동물 친구는 누구인가요?'),
      ('favorite_place', '가고 싶은 곳은 어디인가요?')
  ) AS v(key, label)
) AS updated
WHERE q."storybookTemplateId" = t.id
  AND t.title IN ('숲속 친구들과 생일파티', '숲속 친구들과의 하루')
  AND q.key = updated.key;
