/*
  # Create saved combinations table

  1. New Tables
    - `saved_combinations`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `city_name` (text)
      - `country_name` (text)
      - `city_image_url` (text)
      - `weather_details` (jsonb)
      - `cocktail_name` (text)
      - `cocktail_image_url` (text)
      - `cocktail_ingredients` (text[])
      - `cocktail_recipe` (text[])
      - `created_at` (timestamptz)
  2. Security
    - Enable RLS on `saved_combinations` table
    - Add policy for authenticated users to read their own data
    - Add policy for authenticated users to insert their own data
    - Add policy for authenticated users to delete their own data
*/

CREATE TABLE IF NOT EXISTS saved_combinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  city_name text NOT NULL,
  country_name text NOT NULL,
  city_image_url text NOT NULL,
  weather_details jsonb NOT NULL,
  cocktail_name text NOT NULL,
  cocktail_image_url text NOT NULL,
  cocktail_ingredients text[] NOT NULL,
  cocktail_recipe text[] NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE saved_combinations ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own data
CREATE POLICY "Users can read their own saved combinations"
  ON saved_combinations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Allow users to insert their own data
CREATE POLICY "Users can insert their own saved combinations"
  ON saved_combinations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own data
CREATE POLICY "Users can delete their own saved combinations"
  ON saved_combinations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS saved_combinations_user_id_idx ON saved_combinations (user_id);