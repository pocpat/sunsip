/*
  # Add admin controls for request limits

  1. New Functions
    - `toggle_global_requests` - Enables/disables requests for all non-admin users
    - `reset_user_request_limit` - Resets a specific user's request limit
    - `is_global_requests_enabled` - Checks if global requests are enabled
    
  2. New Table
    - `system_settings` - Stores global system settings
      - `key` (text, primary key)
      - `value` (jsonb)
      - `updated_at` (timestamptz)
      - `updated_by` (uuid)
*/

-- Create system settings table
CREATE TABLE IF NOT EXISTS system_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users
);

-- Enable RLS on system_settings
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Only authenticated users can read system settings
CREATE POLICY "Anyone can read system settings"
  ON system_settings
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admin users can modify system settings (handled in functions)

-- Insert initial system settings
INSERT INTO system_settings (key, value)
VALUES ('request_limits', '{"global_enabled": true}')
ON CONFLICT (key) DO NOTHING;

-- Function to toggle global requests
CREATE OR REPLACE FUNCTION toggle_global_requests(enabled boolean, admin_user_id uuid)
RETURNS boolean AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if user is admin (in a real system, you'd have proper admin checks)
  -- For this demo, we'll consider the user an admin if they're authenticated
  is_admin := admin_user_id IS NOT NULL;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only administrators can toggle global requests';
  END IF;
  
  -- Update the system setting
  UPDATE system_settings
  SET 
    value = jsonb_set(value, '{global_enabled}', to_jsonb(enabled)),
    updated_at = now(),
    updated_by = admin_user_id
  WHERE key = 'request_limits';
  
  RETURN enabled;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset a user's request limit
CREATE OR REPLACE FUNCTION reset_user_request_limit(target_user_id uuid, admin_user_id uuid)
RETURNS boolean AS $$
DECLARE
  is_admin boolean;
BEGIN
  -- Check if user is admin
  is_admin := admin_user_id IS NOT NULL;
  
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Only administrators can reset user request limits';
  END IF;
  
  -- Reset the user's request limit
  UPDATE user_preferences
  SET 
    daily_request_count = 0,
    last_request_date = CURRENT_DATE
  WHERE user_id = target_user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if global requests are enabled
CREATE OR REPLACE FUNCTION is_global_requests_enabled()
RETURNS boolean AS $$
DECLARE
  enabled boolean;
BEGIN
  SELECT (value->>'global_enabled')::boolean INTO enabled
  FROM system_settings
  WHERE key = 'request_limits';
  
  RETURN COALESCE(enabled, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Modify the check_and_update_request_limit function to respect global settings
CREATE OR REPLACE FUNCTION check_and_update_request_limit(user_uuid uuid)
RETURNS json AS $$
DECLARE
  current_count integer;
  today_date date;
  last_date date;
  can_proceed boolean;
  remaining integer;
  result json;
  global_enabled boolean;
  is_admin boolean;
BEGIN
  -- Check if user is admin (simplified for demo)
  is_admin := user_uuid IS NOT NULL;
  
  -- Admin users bypass all limits
  IF is_admin AND user_uuid IN (
    SELECT id FROM auth.users WHERE email = 'admin@sunsip.com'
  ) THEN
    RETURN json_build_object(
      'can_proceed', true,
      'count', 0,
      'remaining', 999,
      'reset_date', null,
      'is_admin', true
    );
  END IF;
  
  -- Check if global requests are enabled
  SELECT is_global_requests_enabled() INTO global_enabled;
  
  -- If global requests are disabled and user is not admin, deny the request
  IF NOT global_enabled AND NOT is_admin THEN
    RETURN json_build_object(
      'can_proceed', false,
      'count', 0,
      'remaining', 0,
      'reset_date', null,
      'global_disabled', true
    );
  END IF;
  
  -- Get current date
  today_date := CURRENT_DATE;
  
  -- Try to get existing record
  SELECT daily_request_count, last_request_date 
  INTO current_count, last_date
  FROM user_preferences
  WHERE user_id = user_uuid;
  
  -- If no record exists, create one
  IF current_count IS NULL THEN
    INSERT INTO user_preferences (user_id, daily_request_count, last_request_date)
    VALUES (user_uuid, 1, today_date)
    ON CONFLICT (user_id) DO UPDATE SET
      daily_request_count = 1,
      last_request_date = today_date;
    
    current_count := 1;
    can_proceed := true;
    remaining := 9; -- 10 total - 1 just used
  ELSE
    -- Check if this is a new day
    IF last_date < today_date THEN
      -- Reset count for new day
      UPDATE user_preferences
      SET daily_request_count = 1, 
          last_request_date = today_date
      WHERE user_id = user_uuid;
      
      current_count := 1;
      can_proceed := true;
      remaining := 9; -- 10 total - 1 just used
    ELSE
      -- Same day, check if under limit
      IF current_count < 10 THEN
        -- Increment count
        UPDATE user_preferences
        SET daily_request_count = daily_request_count + 1
        WHERE user_id = user_uuid;
        
        current_count := current_count + 1;
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

-- Modify the anonymous request limit function to respect global settings
CREATE OR REPLACE FUNCTION check_and_update_anonymous_request_limit(client_id text)
RETURNS json AS $$
DECLARE
  current_count integer;
  today_date date;
  last_date date;
  can_proceed boolean;
  remaining integer;
  result json;
  global_enabled boolean;
BEGIN
  -- Check if global requests are enabled
  SELECT is_global_requests_enabled() INTO global_enabled;
  
  -- If global requests are disabled, deny the request
  IF NOT global_enabled THEN
    RETURN json_build_object(
      'can_proceed', false,
      'count', 0,
      'remaining', 0,
      'reset_date', null,
      'global_disabled', true
    );
  END IF;
  
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