-- database/migrations/add_custom_cards.sql

-- Table to store user-created custom placeholder cards
-- Custom cards have a unique ID (custom-{uuid}), a user-given name, and a chosen color
CREATE TABLE IF NOT EXISTS custom_cards (
  id TEXT PRIMARY KEY,              -- custom-{uuid} format
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,               -- User-given card name
  color TEXT NOT NULL DEFAULT '#000000', -- Hex color chosen by user
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for fast lookups by user
CREATE INDEX idx_custom_cards_user ON custom_cards(user_id);

-- RLS Policies
ALTER TABLE custom_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own custom cards" ON custom_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom cards" ON custom_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom cards" ON custom_cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom cards" ON custom_cards
  FOR DELETE USING (auth.uid() = user_id);
