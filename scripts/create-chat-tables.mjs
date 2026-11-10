// Создание таблиц чата (чат с менеджером на сайте).
// Запуск: node --env-file=.env scripts/create-chat-tables.mjs
// Безопасно: только CREATE TABLE IF NOT EXISTS, существующие данные не трогаются.
import postgres from 'postgres';

const sql = postgres({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});

await sql`
  CREATE TABLE IF NOT EXISTS chat_threads (
    id TEXT PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    client_name TEXT,
    client_phone TEXT,
    unread INT NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'open'
  )
`;

// Порядковый номер диалога для админки (#1, #2...) — вместо uuid-хвоста
await sql`
  ALTER TABLE chat_threads ADD COLUMN IF NOT EXISTS seq BIGSERIAL UNIQUE
`;

await sql`
  CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    thread_id TEXT NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    sender TEXT NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`;

await sql`CREATE INDEX IF NOT EXISTS idx_chat_messages_thread ON chat_messages (thread_id, id)`;

console.log('chat tables ready');
await sql.end();
