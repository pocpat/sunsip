/*
  # Add daily request limit tracking

  1. Changes to user_preferences table
    - Add `daily_request_count` (integer, default 0) - Tracks how many API requests a user has made today
    - Add `last_request_date` (date, default current date) - Tracks the date of the last request
  
  2. Security
    - Existing RLS policies for user_preferences already allow authenticated users to update these new fields
*/

-- Add daily request limit tracking to user_preferences table
DO $$
BEGIN
  -- Add daily_request_count column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'daily_request_count'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN daily_request_count integer DEFAULT 0;
  END IF;

  -- Add last_request_date column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_preferences' AND column_name = 'last_request_date'
  ) THEN
    ALTER TABLE user_preferences ADD COLUMN last_request_date date DEFAULT now()::date;
  END IF;
END $$;

-- Create function to check and update daily request count
CREATE OR REPLACE FUNCTION check_and_update_request_limit(user_uuid uuid)
RETURNS json AS $$
DECLARE
  current_count integer;
  current_date date;
  last_date date;
  can_proceed boolean;
  remaining integer;
  result json;
BEGIN
  -- Get current date
  current_date := now()::date;
  
  -- Try to get existing record
  SELECT daily_request_count, last_request_date 
  INTO current_count, last_date
  FROM user_preferences
  WHERE user_id = user_uuid;
  
  -- If no record exists, create one
  IF current_count IS NULL THEN
    INSERT INTO user_preferences (user_id, daily_request_count, last_request_date)
    VALUES (user_uuid, 1, current_date)
    RETURNING daily_request_count, last_request_date
    INTO current_count, last_date;
    
    can_proceed := true;
    remaining := 9; -- 10 total - 1 just used
  ELSE
    -- Check if this is a new day
    IF last_date < current_date THEN
      -- Reset count for new day
      UPDATE user_preferences
      SET daily_request_count = 1, last_request_date = current_date
      WHERE user_id = user_uuid
      RETURNING daily_request_count
      INTO current_count;
      
      can_proceed := true;
      remaining := 9; -- 10 total - 1 just used
    ELSE
      -- Same day, check if under limit
      IF current_count < 10 THEN
        -- Increment count
        UPDATE user_preferences
        SET daily_request_count = daily_request_count + 1
        WHERE user_id = user_uuid
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
    'reset_date', CASE WHEN current_date = last_date THEN current_date + interval '1 day' ELSE NULL END
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;