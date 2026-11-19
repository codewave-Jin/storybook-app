-- 관리자 토큰 회수 기록
ALTER TYPE "TokenTransactionType" ADD VALUE IF NOT EXISTS 'ADMIN_REVOKE';
