UPDATE "StorybookTemplate"
SET
  title = '숲속 친구들과 생일파티',
  description = '숲속 친구들과 생일파티를 보내며 좋아하는 색깔·동물·장소를 담는 테스트용 동화책',
  "castRoles" = '[{"key":"mom","label":"엄마"},{"key":"dad","label":"아빠"}]'::jsonb
WHERE title IN ('숲속 친구들과의 하루', '숲속 친구들과 생일파티');
