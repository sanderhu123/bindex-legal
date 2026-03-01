-- database/migrations/add_binder_placeholder_cards.sql

-- Table to persist placeholder tray cards per binder
-- Each binder has its own placeholder tray that survives edit mode exits
CREATE TABLE IF NOT EXISTS binder_placeholder_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  binder_id UUID NOT NULL REFERENCES binders(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL,  -- Order within the placeholder tray (0-17)
  card_id TEXT NOT NULL,        -- TCGDEX card ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Each placeholder slot can only have one card
  UNIQUE(binder_id, user_id, slot_index)
);

-- Indexes for fast lookups
CREATE INDEX idx_placeholder_cards_binder ON binder_placeholder_cards(binder_id);
CREATE INDEX idx_placeholder_cards_user ON binder_placeholder_cards(user_id);

-- RLS Policies
ALTER TABLE binder_placeholder_cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own placeholder cards" ON binder_placeholder_cards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own placeholder cards" ON binder_placeholder_cards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own placeholder cards" ON binder_placeholder_cards
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own placeholder cards" ON binder_placeholder_cards
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER placeholder_cards_updated_at
  BEFORE UPDATE ON binder_placeholder_cards
  FOR EACH ROW
  EXECUTE FUNCTION update_binder_positions_updated_at();
