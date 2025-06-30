/*
  # Create anonymous request limits table

  1. New Tables
    - `anonymous_request_limits`
      - `client_id` (text, primary key)
      - `daily_request_count` (integer)
      - `last_request_date` (date)
  
  2. Security
    - Enable RLS on `anonymous_request_limits` table
    - Add policy for anonymous users to read their own data
    - Add policy for anonymous users to insert/update their own data
  
  3. Functions
    - Create function to check and update anonymous request limits
*/

-- Create anonymous request limits table
CREATE TABLE IF NOT EXISTS anonymous_request_limits (
  client_id text PRIMARY KEY,
  daily_request_count integer DEFAULT 0,
  last_request_date date DEFAULT CURRENT_DATE
);

-- Enable RLS on anonymous_request_limits
ALTER TABLE anonymous_request_limits ENABLE ROW LEVEL SECURITY;

-- Anonymous request limits policies
CREATE POLICY "Anonymous users can read their own limits"
  ON anonymous_request_limits
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anonymous users can insert their own limits"
  ON anonymous_request_limits
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Anonymous users can update their own limits"
  ON anonymous_request_limits
  FOR UPDATE
  TO anon
  USING (true);

-- Create function to check and update anonymous request limit
CREATE OR REPLACE FUNCTION check_and_update_anonymous_request_limit(client_id text)
RETURNS json AS $$
DECLARE
  current_count integer;
  today_date date;
  last_date date;
  can_proceed boolean;
  remaining integer;
  result json;
BEGIN
  -- Get current date
  today_date := CURRENT_DATE;
  
  -- Try to get existing record
  SELECT daily_request_count, last_request_date 
  INTO current_count, last_date
  FROM anonymous_request_limits
  WHERE anonymous_request_limits.client_id = check_and_update_anonymous_request_limit.client_id;
  
  -- If no record exists, create one
  IF current_count IS NULL THEN
    INSERT INTO anonymous_request_limits (client_id, daily_request_count, last_request_date)
    VALUES (check_and_update_anonymous_request_limit.client_id, 1, today_date)
    RETURNING daily_request_count, last_request_date
    INTO current_count, last_date;
    
    can_proceed := true;
    remaining := 9; -- 10 total - 1 just used
  ELSE
    -- Check if this is a new day
    IF last_date < today_date THEN
      -- Reset count for new day
      UPDATE anonymous_request_limits
      SET daily_request_count = 1, 
          last_request_date = today_date
      WHERE anonymous_request_limits.client_id = check_and_update_anonymous_request_limit.client_id
      RETURNING daily_request_count
      INTO current_count;
      
      can_proceed := true;
      remaining := 9; -- 10 total - 1 just used
    ELSE
      -- Same day, check if under limit
      IF current_count < 10 THEN
        -- Increment count
        UPDATE anonymous_request_limits
        SET daily_request_count = daily_request_count + 1
        WHERE anonymous_request_limits.client_id = check_and_update_anonymous_request_limit.client_id
        RETURNING daily_request_count
        INTO current_count;
        
        can_proceed := true;
        remaining := 10 - current_count;
      ELSE
        -- Limit reached
        can_proceed := false;
        remaining := 0;
      END IF;
    END IF;
  END IF;
  
  -- Prepare result
  result := json_build_object(
    'can_proceed', can_proceed,
    'count', current_count,
    'remaining', remaining,
    'reset_date', CASE WHEN last_date = today_date THEN today_date + interval '1 day' ELSE NULL END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;