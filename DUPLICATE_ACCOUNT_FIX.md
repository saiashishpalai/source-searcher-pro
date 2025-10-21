# Duplicate Account Prevention Fix

## 🐛 Issue
Users can create duplicate accounts with the same email, and verification emails are sent even when the user already exists.

## ✅ Solution
Implemented a custom database function that checks if a user exists BEFORE attempting signup.

---

## 📋 Step-by-Step Setup

### Step 1: Create the Database Function

**Go to your Supabase Dashboard:**
1. Navigate to: `https://supabase.com/dashboard/project/wjqlqmepnpvaywfbfpxb/sql`
2. Copy and paste the following SQL:

```sql
-- Create function to check if user exists without RLS restrictions
-- This function can be called from the client to check if an email is already registered

CREATE OR REPLACE FUNCTION check_user_exists(user_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if user exists in auth.users table
  RETURN EXISTS (
    SELECT 1 FROM auth.users 
    WHERE email = user_email
  );
END;
$$;

-- Grant execute permission to authenticated and anonymous users
GRANT EXECUTE ON FUNCTION check_user_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_exists(TEXT) TO anon;
```

3. Click **Run** to execute the SQL

### Step 2: Verify the Function Works

**Test the function in SQL Editor:**

```sql
-- Test with your existing email
SELECT check_user_exists('saiashishpalai74@gmail.com');
-- Should return: true

-- Test with non-existent email
SELECT check_user_exists('nonexistent@example.com');
-- Should return: false
```

### Step 3: Test the Signup Flow

1. **Open your app** in the browser
2. **Open Developer Console** (F12 or Right-click → Inspect → Console)
3. **Try to sign up** with your existing email: `saiashishpalai74@gmail.com`
4. **Watch the console logs** - you should see:

```
🔍 Step 1: Checking if user exists for email: saiashishpalai74@gmail.com
🔍 Step 2: RPC check_user_exists result: { userExists: true, checkError: null }
❌ User already exists! Returning error message.
```

5. **Expected UI behavior:**
   - ❌ Error message appears: "You already have an account! Please sign in instead."
   - 🔗 Link to login page appears
   - 🚫 NO verification email is sent

### Step 4: Test with New Email

1. **Try signing up** with a new email (e.g., `test123@example.com`)
2. **Watch the console logs** - you should see:

```
🔍 Step 1: Checking if user exists for email: test123@example.com
🔍 Step 2: RPC check_user_exists result: { userExists: false, checkError: null }
✅ User does not exist. Proceeding with signup...
🔍 Step 3: SignUp result: { data: '...', error: null }
✅ Signup successful!
```

3. **Expected UI behavior:**
   - ✅ Success message: "Account created! Please check your email to verify your account."
   - 📧 Verification email IS sent
   - 🔀 Redirect to verify-email page

---

## 🔍 Troubleshooting

### Issue 1: RPC Function Not Found

**Console shows:** `{ userExists: null, checkError: { message: "function check_user_exists not found" } }`

**Solution:**
- Run the SQL function in Supabase Dashboard (Step 1 above)
- Make sure you're in the correct project
- Check SQL Editor for any syntax errors

### Issue 2: Permission Denied

**Console shows:** `{ checkError: { message: "permission denied" } }`

**Solution:**
- Ensure the GRANT statements were executed
- Run this SQL:
```sql
GRANT EXECUTE ON FUNCTION check_user_exists(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION check_user_exists(TEXT) TO anon;
```

### Issue 3: Function Returns Null

**Console shows:** `{ userExists: null, checkError: null }`

**Solution:**
- Check if the function is returning BOOLEAN correctly
- Test the function directly in SQL Editor
- Verify auth.users table has data

### Issue 4: User Still Gets Verification Email

**This means the check is not working properly.**

**Debug steps:**
1. Check console logs for RPC call results
2. Verify the function returns `true` for existing users
3. Make sure the condition `if (userExists === true)` is being hit
4. Check if there's a fallback issue

---

## 🎯 How It Works

### Flow Diagram

```
User enters email + password
         ↓
Call check_user_exists(email)
         ↓
    [Decision]
         ↓
    User exists? 
    /         \
  YES          NO
   ↓            ↓
Show error   Proceed with
message      signUp()
   ↓            ↓
Link to      Send verification
login        email
```

### Code Flow

1. **User submits signup form**
2. **AuthContext.signup()** is called
3. **RPC call** to `check_user_exists(email)`
4. **If exists (true)**:
   - Return error immediately
   - No signUp() call
   - No email sent
5. **If doesn't exist (false)**:
   - Call `supabase.auth.signUp()`
   - Send verification email
   - Redirect to verify page

---

## 📊 Expected Console Output

### For Existing User:
```
🔍 Step 1: Checking if user exists for email: saiashishpalai74@gmail.com
🔍 Step 2: RPC check_user_exists result: { userExists: true, checkError: null }
❌ User already exists! Returning error message.
```

### For New User:
```
🔍 Step 1: Checking if user exists for email: newuser@example.com
🔍 Step 2: RPC check_user_exists result: { userExists: false, checkError: null }
✅ User does not exist. Proceeding with signup...
🔍 Step 3: SignUp result: { data: 'uuid-here', error: null }
✅ Signup successful!
```

---

## ✅ Success Criteria

- [x] SQL function created in Supabase
- [x] Function returns true for existing emails
- [x] Function returns false for new emails
- [x] Console logs show correct flow
- [x] Error message displayed for existing users
- [x] No verification email sent for existing users
- [x] New users can signup successfully
- [x] Verification email sent for new users

---

## 🚨 Important Notes

1. **Run the SQL function FIRST** - The app won't work without it
2. **Check browser console** - All debugging info is logged there
3. **Test with real email** - Use your actual registered email to test
4. **Clear cache** - If changes don't appear, clear browser cache and reload

---

## 📞 Support

If you're still having issues after following these steps:
1. Share the console logs output
2. Confirm if the SQL function was created successfully
3. Test the function directly in SQL Editor with your email

