-- Render PostgreSQL schema for the WhatsApp AI Agent.
-- Run once against DATABASE_URL:  node scripts/migrate.mjs

create extension if not exists pgcrypto;

create table if not exists conversations (
  id uuid default gen_random_uuid() primary key,
  phone text unique not null,
  name text,
  mode text not null default 'agent' check (mode in ('agent', 'human')),
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists messages (
  id uuid default gen_random_uuid() primary key,
  conversation_id uuid references conversations(id) on delete cascade not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  whatsapp_msg_id text unique,
  created_at timestamptz default now()
);

create index if not exists idx_messages_conversation on messages(conversation_id);
create index if not exists idx_conversations_updated on conversations(updated_at desc);
