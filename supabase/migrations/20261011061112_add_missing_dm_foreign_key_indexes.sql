-- Add indexes for foreign-key columns flagged by Supabase Performance Advisor.
-- Applied to project ckxgbmvjehshgicafsjp as migration add_missing_dm_foreign_key_indexes.
create index if not exists nexora_dm_conversations_created_by_idx
  on public.nexora_dm_conversations (created_by);

create index if not exists nexora_dm_messages_sender_id_idx
  on public.nexora_dm_messages (sender_id);
