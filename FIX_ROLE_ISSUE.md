# 🔧 Fix User Role Issue

## Problem
You're logged in as `batman@gmail.com` but showing as **warehouse_staff** instead of **admin**.

## Root Cause
The `handle_new_user()` trigger in the schema assigns all new users the 'warehouse_staff' role by default (line 242 in schema.sql).

## Quick Fix

### Option 1: Run SQL Script (Recommended)

1. **Open Supabase SQL Editor**
   - https://app.supabase.com/project/sgvuwilskrfmxchuvfab/sql/new

2. **Copy and paste** the contents of: `supabase/fix_batman_role.sql`

3. **Click Run**

4. **Refresh your browser** - you should now have admin access!

### Option 2: Manual SQL Query

Run this single query in Supabase SQL Editor:

```sql
-- Delete old role and insert admin role
DELETE FROM user_roles 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'batman@gmail.com');

INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'batman@gmail.com';
```

Then **refresh your browser**.

## What the Fix Does

The `fix_batman_role.sql` script does 3 things:

1. ✅ **Fixes your current role**
   - Deletes the 'warehouse_staff' role
   - Assigns you 'admin' role
   - Updates your employee record

2. ✅ **Updates the trigger**
   - Changes default role from 'warehouse_staff' to 'admin'
   - New users will now be admins by default

3. ✅ **Verifies the changes**
   - Shows your updated role
   - Displays confirmation message

## Verification

After running the fix, verify with:

```sql
SELECT 
  u.email,
  ur.role as user_role
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'batman@gmail.com';
```

You should see:
- email: `batman@gmail.com`
- user_role: `admin`

## After the Fix

Once you refresh your browser, you should have access to:
- ✅ Admin panel
- ✅ User management
- ✅ All inventory operations
- ✅ Order management
- ✅ Full system access

---

**Note**: If you're still seeing warehouse_staff after refreshing, try:
1. Clear browser cache
2. Log out and log back in
3. Check the browser console for any errors
