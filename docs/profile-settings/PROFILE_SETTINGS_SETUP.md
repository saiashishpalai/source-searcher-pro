# Profile Settings - Quick Setup Guide

## 🚀 Quick Start (5 minutes)

### Step 1: Run Database Migration

Choose one of the following methods:

#### Option A: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `profile-fields-migration.sql`
5. Click **Run** or press `Ctrl+Enter`
6. Verify success message appears

#### Option B: Using Supabase CLI
```bash
supabase db push
```

#### Option C: Using psql
```bash
psql -h <db-host> -U postgres -d postgres -f profile-fields-migration.sql
```

### Step 2: Verify Storage Bucket

1. Go to **Storage** in Supabase Dashboard
2. Confirm `profile-images` bucket exists
3. Verify it's marked as **Public**
4. Check **Policies** tab shows 4 policies:
   - Users can upload own avatar
   - Users can update own avatar
   - Users can delete own avatar
   - Anyone can view avatars

### Step 3: Test the Feature

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Log in to your application

3. Click on your avatar in the top right

4. Select **"Profile Settings"**

5. Test the following:
   - [ ] Edit your name
   - [ ] Upload a profile photo
   - [ ] Add a role/designation
   - [ ] Add an organization
   - [ ] Click "Save Changes"
   - [ ] Verify toast notification appears
   - [ ] Refresh the page and confirm changes persist

## 🧪 Testing Checklist

### Basic Functionality
- [ ] Page loads without errors
- [ ] Profile data fetches correctly
- [ ] Name field accepts input
- [ ] Email field is read-only
- [ ] Role field accepts input (optional)
- [ ] Organization field accepts input (optional)
- [ ] Save button disabled when no changes
- [ ] Save button enabled when changes made

### Validation
- [ ] Name field shows error when empty
- [ ] Name field shows error when < 2 characters
- [ ] Name field shows error when > 50 characters
- [ ] Role field shows error when > 50 characters
- [ ] Organization field shows error when > 100 characters
- [ ] Save button disabled when validation errors exist

### Profile Photo Upload
- [ ] Click "Upload Photo" opens file picker
- [ ] Image preview appears immediately after selection
- [ ] Error shown for non-image files
- [ ] Error shown for files > 5MB
- [ ] Remove button appears on hover
- [ ] Click remove button clears preview
- [ ] Avatar shows user initials when no photo

### Save Functionality
- [ ] "Save Changes" button shows loading state
- [ ] Success toast appears on successful save
- [ ] Error toast appears on failed save
- [ ] "Unsaved changes" indicator appears when editing
- [ ] "All changes saved" indicator appears after save
- [ ] Changes persist after page refresh

### Responsive Design
- [ ] Layout works on mobile (< 640px)
- [ ] Layout works on tablet (640px - 1024px)
- [ ] Layout works on desktop (> 1024px)
- [ ] Save button is sticky on mobile
- [ ] All text is readable at all sizes
- [ ] Touch targets are appropriate size on mobile

### Animations
- [ ] Page entrance animation (fade + slide-up)
- [ ] Staggered section animations
- [ ] Avatar hover scale animation
- [ ] Save button shimmer on hover
- [ ] Smooth transitions on all interactions
- [ ] Loading spinner during data fetch

### Edge Cases
- [ ] Works for newly created users (no profile data yet)
- [ ] Handles network errors gracefully
- [ ] Handles Supabase errors gracefully
- [ ] Works when offline (shows appropriate error)
- [ ] Handles concurrent edits (last write wins)

## 🔧 Common Issues & Solutions

### Issue: "Failed to load profile data"

**Possible Causes:**
1. User not authenticated
2. RLS policies not configured
3. Profile row doesn't exist

**Solution:**
```sql
-- Check if profile exists
SELECT * FROM profiles WHERE id = 'user-uuid-here';

-- Create profile if missing
INSERT INTO profiles (id, email) 
VALUES ('user-uuid', 'user@email.com');

-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

### Issue: "Failed to upload image"

**Possible Causes:**
1. Storage bucket doesn't exist
2. RLS policies not configured
3. File too large
4. Invalid file type

**Solution:**
1. Check storage bucket exists:
   ```sql
   SELECT * FROM storage.buckets WHERE name = 'profile-images';
   ```

2. Check storage policies:
   ```sql
   SELECT * FROM storage.policies WHERE bucket_id = 'profile-images';
   ```

3. Verify file size < 5MB

4. Check file type is image/*

### Issue: "Changes not saving"

**Possible Causes:**
1. Validation errors
2. Network issues
3. RLS policy violation
4. Database constraints

**Solution:**
1. Check browser console for errors
2. Check validation error messages
3. Verify network tab shows successful request
4. Check Supabase logs for errors

### Issue: "Animations not working"

**Possible Causes:**
1. CSS not loaded
2. Browser doesn't support animations
3. Reduced motion preference enabled

**Solution:**
1. Hard refresh browser (Ctrl+Shift+R)
2. Check browser DevTools for CSS errors
3. Verify `tailwindcss-animate` is installed
4. Check if user has reduced motion enabled

## 🎯 Performance Benchmarks

Expected performance metrics:

- **Initial page load**: < 1 second
- **Profile data fetch**: < 500ms
- **Image upload (1MB)**: < 2 seconds
- **Save changes**: < 500ms
- **Form validation**: Instant (< 50ms)

## 🔒 Security Verification

### Verify RLS Policies

```sql
-- Test as authenticated user
SELECT * FROM profiles WHERE id = auth.uid();

-- Should fail (other user's profile)
SELECT * FROM profiles WHERE id != auth.uid();

-- Test update
UPDATE profiles SET name = 'Test' WHERE id = auth.uid();

-- Should fail (other user's profile)
UPDATE profiles SET name = 'Test' WHERE id != auth.uid();
```

### Verify Storage Policies

```sql
-- List all policies
SELECT * FROM storage.policies WHERE bucket_id = 'profile-images';

-- Test upload (should succeed for own folder)
-- Upload to: avatars/{your-user-id}-timestamp.jpg

-- Test upload (should fail for other user's folder)
-- Upload to: avatars/{other-user-id}-timestamp.jpg
```

## 📊 Monitoring

### Key Metrics to Track

1. **Profile Completeness**
   ```sql
   SELECT 
     COUNT(*) FILTER (WHERE name IS NOT NULL) as has_name,
     COUNT(*) FILTER (WHERE avatar_url IS NOT NULL) as has_avatar,
     COUNT(*) FILTER (WHERE role IS NOT NULL) as has_role,
     COUNT(*) FILTER (WHERE organization IS NOT NULL) as has_org,
     COUNT(*) as total_users
   FROM profiles;
   ```

2. **Upload Success Rate**
   ```sql
   -- Check storage bucket usage
   SELECT COUNT(*) FROM storage.objects 
   WHERE bucket_id = 'profile-images';
   ```

3. **Update Frequency**
   ```sql
   SELECT 
     COUNT(*) as total_updates,
     AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_time_to_first_update
   FROM profiles 
   WHERE updated_at > created_at;
   ```

## 🚢 Production Deployment

### Pre-deployment Checklist

- [ ] Run migration on production database
- [ ] Verify storage bucket in production
- [ ] Test with production credentials
- [ ] Check error logging is configured
- [ ] Verify backup policy for profiles table
- [ ] Test RLS policies in production
- [ ] Monitor initial user feedback
- [ ] Document any production-specific configs

### Rollback Plan

If issues occur:

1. **Immediate**: Disable route temporarily
   ```tsx
   // In App.tsx, comment out:
   // <Route path="/profile-settings" element={...} />
   ```

2. **Database Rollback** (if needed):
   ```sql
   -- Remove new columns (data will be lost!)
   ALTER TABLE profiles 
   DROP COLUMN name,
   DROP COLUMN avatar_url,
   DROP COLUMN role,
   DROP COLUMN organization;
   
   -- Remove storage bucket
   DELETE FROM storage.buckets WHERE name = 'profile-images';
   ```

3. **Code Rollback**: Revert Git commits
   ```bash
   git revert <commit-hash>
   git push
   ```

## 📝 Post-Deployment Tasks

1. **Monitor Logs**
   - Check for errors in first 24 hours
   - Monitor storage bucket growth
   - Track profile update frequency

2. **User Feedback**
   - Collect initial user feedback
   - Monitor support tickets
   - Track feature usage analytics

3. **Documentation**
   - Update user documentation
   - Create video tutorial (optional)
   - Add to onboarding flow (optional)

## 🎓 For Developers

### Code Structure

```
src/
├── pages/
│   └── ProfileSettings.tsx     # Main component
├── components/
│   └── UserProfile.tsx         # Updated navigation
├── integrations/
│   └── supabase/
│       └── types.ts            # Updated with new fields
└── App.tsx                     # New route added

profile-fields-migration.sql    # Database changes
PROFILE_SETTINGS_README.md      # Feature documentation
PROFILE_SETTINGS_SETUP.md       # This file
```

### Key Technologies

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Supabase** - Backend & storage
- **Tailwind CSS** - Styling
- **Radix UI** - Component primitives
- **React Router** - Navigation
- **Lucide React** - Icons

### Development Tips

1. **Local Testing**
   ```bash
   # Start with hot reload
   npm run dev
   
   # Test production build
   npm run build
   npm run preview
   ```

2. **Debugging**
   - Use React DevTools
   - Check Network tab for API calls
   - Monitor Supabase logs
   - Check browser console for errors

3. **Type Safety**
   ```typescript
   // Generate types from Supabase
   supabase gen types typescript --project-id <project-id> > types.ts
   ```

## 🆘 Getting Help

If you encounter issues:

1. Check this setup guide
2. Review [PROFILE_SETTINGS_README.md](./PROFILE_SETTINGS_README.md)
3. Check browser console for errors
4. Review Supabase logs
5. Search existing GitHub issues
6. Create new issue with:
   - Error message
   - Steps to reproduce
   - Browser/OS information
   - Screenshots if applicable

## ✅ Success Criteria

The feature is working correctly when:

- ✅ Users can access profile settings page
- ✅ All profile fields are editable
- ✅ Profile photos can be uploaded
- ✅ Changes save successfully
- ✅ Changes persist after refresh
- ✅ Validation works correctly
- ✅ Error handling is graceful
- ✅ Responsive on all devices
- ✅ Animations are smooth
- ✅ No console errors

Congratulations! 🎉 Your Profile Settings feature is now live!

