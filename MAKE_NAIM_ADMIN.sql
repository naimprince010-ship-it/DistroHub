-- Make Naim Rahaman Admin
-- Run this in Supabase SQL Editor

-- Update role to admin
UPDATE public.users
SET role = 'admin'
WHERE email = 'naimprince236@gmail.com';

-- Verify the change
SELECT 
    id,
    email,
    name,
    role,
    phone,
    created_at
FROM public.users
WHERE email = 'naimprince236@gmail.com';

-- Expected result:
-- role should be 'admin'
