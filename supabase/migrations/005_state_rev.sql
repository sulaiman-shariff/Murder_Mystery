-- Concurrency support for multi-device play.
--
-- Several routes read game_sessions.state, modify it in JS and write it back.
-- With a whole team playing on separate phones those writes race and silently
-- lose each other. state_rev gives every write a precondition: update only if
-- the row is still at the revision we read, otherwise re-read and retry.
ALTER TABLE game_sessions
  ADD COLUMN IF NOT EXISTS state_rev INT NOT NULL DEFAULT 0;

-- Interrogation confrontations are logged like any other AI call, but the
-- type column's CHECK constraint only allowed the original four values, so
-- they had to masquerade as detective_chat.
ALTER TABLE ai_interactions DROP CONSTRAINT IF EXISTS ai_interactions_type_check;
ALTER TABLE ai_interactions ADD CONSTRAINT ai_interactions_type_check
  CHECK (type IN ('murderer_validation','motive_validation','hint','detective_chat','interrogation'));
