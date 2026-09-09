DELETE FROM "PageTemplate"
WHERE "pageNumber" > 8
  AND "storybookTemplateId" IN (
    SELECT id
    FROM "StorybookTemplate"
    WHERE title IN ('숲속 친구들과 생일파티', '숲속 친구들과의 하루')
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
      (1, 'COVER', 1, '1번 캐릭터가 초록빛 숲 입구에 서서 손을 흔들고, 좋아하는 색깔 {{answer.favorite_color}} 풍선이 하늘로 떠오른다.', NULL),
      (2, 'PAGE', 1, E'{{character_1}}가 아침 햇살이 들어오는 방에서 침대에 일어나 기지개를 켜고 있다.\n포인트 색깔은 {{answer.favorite_color}}이다.', NULL),
      (3, 'PAGE', 1, '{{character_1}}가 오두막을 나와 숲속 길을 산책하다가, 앞에서 {{answer.favorite_animal}}을(를) 만난다.', '눈을 크게 뜨고 입을 살짝 벌린 놀란 표정'),
      (4, 'PAGE', 1, '{{character_1}}이(가) 덤불 사이로 손을 내밀자 {{answer.favorite_animal}}이(가) 살며시 다가와, 함께 {{answer.favorite_color}} 꽃길을 걸어간다.', NULL),
      (5, 'PAGE', 1, '키 큰 나무 아래에서 {{character_1}}이(가) 생일 도시락과 작은 케이크를 펼치고, {{answer.favorite_animal}}에게도 간식을 나눠 준다. 포인트 색깔은 {{answer.favorite_color}}이다.', NULL),
      (6, 'PAGE', 1, '갑자기 바람이 불어 {{answer.favorite_color}} 나뭇잎이 흩날리고, {{character_1}}이(가) 신나게 뛰어다니며 잎사귀를 모아 둔다.', NULL),
      (7, 'PAGE', 2, '{{character_1}}과(와) {{character_2}}이(가) 통나무 다리를 조심조심 건너며, 건너편 생일파티 오두막을 가리켜 이야기한다.', NULL),
      (8, 'PAGE', 1, '따뜻한 이불 속에서 {{character_1}}이(가) 미소 지며 잠들고, 꿈속에 {{answer.favorite_animal}}과(와) 숲속 생일파티를 다시 거닌다.', NULL)
  ) AS v("pageNumber", "pageType", "characterSlots", "promptTemplate", "expressionHint")
) AS v
WHERE p."storybookTemplateId" = t.id
  AND t.title IN ('숲속 친구들과 생일파티', '숲속 친구들과의 하루')
  AND p."pageNumber" = v."pageNumber";
