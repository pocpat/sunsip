/*
  # Add user preferences and enhance saved combinations

  1. New Tables
    - `user_preferences`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `preferred_spirits` (text[]) - User's favorite spirits
      - `dietary_restrictions` (text[]) - Allergies, preferences
      - `favorite_weather_moods` (jsonb) - Weather conditions they enjoy
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Enhanced saved_combinations
    - Add `rating` (integer) - User rating 1-5
    - Add `notes` (text) - Personal notes about the combination
    - Add `times_accessed` (integer) - Track popularity
    - Add `last_accessed_at` (timestamptz)

  3. New indexes for better performance
    - Index on rating for popular combinations
    - Index on last_accessed_at for recent combinations

  4. Security
    - Enable RLS on user_preferences table
    - Add policies for authenticated users to manage their preferences
*/

-- Create user preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL UNIQUE,
  preferred_spirits text[] DEFAULT '{}',
  dietary_restrictions text[] DEFAULT '{}',
  favorite_weather_moods jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on user_preferences
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- User preferences policies
CREATE POLICY "Users can read their own preferences"
  ON user_preferences
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add enhancements to saved_combinations
DO $$
BEGIN
  -- Add rating column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_combinations' AND column_name = 'rating'
  ) THEN
    ALTER TABLE saved_combinations ADD COLUMN rating integer CHECK (rating >= 1 AND rating <= 5);
  END IF;

  -- Add notes column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_combinations' AND column_name = 'notes'
  ) THEN
    ALTER TABLE saved_combinations ADD COLUMN notes text DEFAULT '';
  END IF;

  -- Add times_accessed column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_combinations' AND column_name = 'times_accessed'
  ) THEN
    ALTER TABLE saved_combinations ADD COLUMN times_accessed integer DEFAULT 0;
  END IF;

  -- Add last_accessed_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'saved_combinations' AND column_name = 'last_accessed_at'
  ) THEN
    ALTER TABLE saved_combinations ADD COLUMN last_accessed_at timestamptz;
  END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS saved_combinations_rating_idx ON saved_combinations (rating DESC) WHERE rating IS NOT NULL;
CREATE INDEX IF NOT EXISTS saved_combinations_last_accessed_idx ON saved_combinations (last_accessed_at DESC) WHERE last_accessed_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS user_preferences_user_id_idx ON user_preferences (user_id);

-- Create function to update last_accessed_at
CREATE OR REPLACE FUNCTION update_combination_access(combination_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE saved_combinations 
  SET 
    times_accessed = COALESCE(times_accessed, 0) + 1,
    last_accessed_at = now()
  WHERE id = combination_id AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get user's top combinations
CREATE OR REPLACE FUNCTION get_user_top_combinations(user_uuid uuid, limit_count integer DEFAULT 5)
RETURNS TABLE (
  id uuid,
  city_name text,
  country_name text,
  cocktail_name text,
  rating integer,
  times_accessed integer,
  last_accessed_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sc.id,
    sc.city_name,
    sc.country_name,
    sc.cocktail_name,
    sc.rating,
    sc.times_accessed,
    sc.last_accessed_at
  FROM saved_combinations sc
  WHERE sc.user_id = user_uuid
  ORDER BY 
    COALESCE(sc.rating, 0) DESC,
    COALESCE(sc.times_accessed, 0) DESC,
    sc.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;