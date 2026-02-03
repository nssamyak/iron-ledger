-- =====================================================
-- FIX USER ROLE ISSUE
-- This script fixes the role for batman@gmail.com and updates the trigger
-- =====================================================

-- STEP 1: Fix batman@gmail.com role immediately
-- =====================================================

-- Delete the old warehouse_staff role
DELETE FROM user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'batman@gmail.com');

-- Insert admin role
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'batman@gmail.com';

-- Update employee record
UPDATE employees
SET role_id = (SELECT role_id FROM roles WHERE role_name = 'Administrator' LIMIT 1),
    d_id = (SELECT d_id FROM departments WHERE d_name = 'Executive' LIMIT 1)
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'batman@gmail.com');

-- STEP 2: Update the trigger to assign admin by default
-- =====================================================

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate the function with admin as default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Create employee record
  INSERT INTO public.employees (user_id, f_name, l_name, role_id, d_id)
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data ->> 'first_name', split_part(new.email, '@', 1)),
    COALESCE(new.raw_user_meta_data ->> 'last_name', 'User'),
    (SELECT role_id FROM roles WHERE role_name = 'Administrator' LIMIT 1),
    (SELECT d_id FROM departments WHERE d_name = 'Executive' LIMIT 1)
  );
  
  -- Default role assignment - CHANGED TO ADMIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (new.id, 'admin');
  
  RETURN new;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- STEP 3: Verify the changes
-- =====================================================

-- Check batman@gmail.com role
SELECT 
  u.email,
  ur.role as user_role,
  r.role_name as employee_role,
  d.d_name as department
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN employees e ON u.id = e.user_id
LEFT JOIN roles r ON e.role_id = r.role_id
LEFT JOIN departments d ON e.d_id = d.d_id
WHERE u.email = 'batman@gmail.com';

-- Display success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'USER ROLE FIX COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'batman@gmail.com is now an ADMIN';
  RAISE NOTICE 'New users will now be assigned ADMIN role by default';
  RAISE NOTICE 'Please refresh your browser to see changes';
  RAISE NOTICE '========================================';
END $$;
