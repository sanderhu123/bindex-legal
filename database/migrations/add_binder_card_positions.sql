-- database/migrations/add_binder_card_positions.sql

-- Table to store card positions in binders (for Master Set and Custom binders)
CREATE TABLE IF NOT EXISTS binder_card_positions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  binder_id UUID NOT NULL REFERENCES binders(id) ON DELETE CASCADE,
  slot_index INTEGER NOT NULL, -- Position in binder (0-359 for 3x3, 0-479 for 4x3)
  card_id TEXT NOT NULL, -- TCGDEX card ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Each slot can only have one card
  UNIQUE(binder_id, slot_index)
);

-- Indexes for fast lookups
CREATE INDEX idx_binder_positions_binder ON binder_card_positions(binder_id);
CREATE INDEX idx_binder_positions_user ON binder_card_positions(user_id);

-- RLS Policies
ALTER TABLE binder_card_positions ENABLE ROW LEVEL SECURITY;

-- Users can only see their own positions
CREATE POLICY "Users can view own positions" ON binder_card_positions
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own positions
CREATE POLICY "Users can insert own positions" ON binder_card_positions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own positions
CREATE POLICY "Users can update own positions" ON binder_card_positions
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own positions
CREATE POLICY "Users can delete own positions" ON binder_card_positions
  FOR DELETE USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_binder_positions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER binder_positions_updated_at
  BEFORE UPDATE ON binder_card_positions
  FOR EACH ROW
  EXECUTE FUNCTION update_binder_positions_updated_at();
