# Profile Settings Feature

## Overview

The Profile Settings page allows users to view and edit their profile information including name, profile photo, role/designation, and organization name.

## Features

### ✨ Core Functionality

1. **Editable Profile Fields**
   - Name (required, 2-50 characters)
   - Email (read-only, linked to login)
   - Profile photo (upload or remove)
   - Role/Designation (optional, max 50 characters)
   - Organization name (optional, max 100 characters)

2. **Profile Photo Management**
   - Upload images (max 5MB)
   - Supported formats: JPEG, PNG, GIF, WEBP
   - Immediate preview before saving
   - Remove photo option
   - Hover animation on avatar
   - Auto-fallback to user initials

3. **Real-time Validation**
   - Inline validation for each field
   - Visual error indicators
   - Field-specific error messages
   - Save button disabled until validation passes

4. **Save State Management**
   - Detects unsaved changes
   - Visual indicator for unsaved/saved state
   - Confirmation on successful save
   - Toast notifications for success/error states

### 🎨 Design & UX

1. **Animations**
   - Page entrance: fade + slide-up animations
   - Avatar hover: scale-up effect
   - Save button: shimmer effect on hover
   - Smooth transitions on all interactions
   - Staggered entrance animations for sections

2. **Responsive Design**
   - Mobile-first approach
   - Sticky save button on mobile
   - Adaptive layout for tablet and desktop
   - Touch-optimized button sizes

3. **Visual Feedback**
   - Loading states during data fetch
   - Upload progress indication
   - Save progress animation
   - Success/error toast notifications
   - Real-time validation feedback

## Setup Instructions

### 1. Database Migration

Run the migration to add new profile fields:

```bash
# Connect to your Supabase project and run:
psql -h <your-supabase-host> -U postgres -d postgres -f profile-fields-migration.sql
```

Or use the Supabase dashboard SQL editor to execute `profile-fields-migration.sql`.

### 2. Storage Bucket Setup

The migration automatically creates a `profile-images` storage bucket with the following policies:

- **Public read access**: Anyone can view profile photos
- **Authenticated write access**: Users can upload/update/delete their own photos
- **Automatic folder structure**: Images stored as `avatars/{userId}-{timestamp}.{ext}`

If you need to manually create the bucket:

1. Go to Supabase Dashboard → Storage
2. Create bucket named `profile-images`
3. Set as public
4. Enable RLS policies (included in migration)

### 3. Environment Variables

Ensure these are set in your `.env` file:

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Update Existing Users (Optional)

If you have existing users, you may want to populate default names:

```sql
UPDATE profiles 
SET name = split_part(email, '@', 1)
WHERE name IS NULL;
```

## Usage

### Accessing Profile Settings

Users can access Profile Settings from:

1. **User dropdown menu** in the top navigation
   - Click avatar → "Profile Settings"

2. **Direct URL navigation**
   - Navigate to `/profile-settings`

### For Developers

#### Import and Use

```tsx
import ProfileSettings from '@/pages/ProfileSettings';

// The route is already configured in App.tsx:
<Route path="/profile-settings" element={
  <ProtectedRoute>
    <ProfileSettings />
  </ProtectedRoute>
} />
```

#### Profile Data Structure

```typescript
interface ProfileData {
  name: string;
  email: string;
  avatar_url: string;
  role: string;
  organization: string;
}
```

#### API Integration

The component uses Supabase client directly:

```typescript
// Fetch profile
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();

// Update profile
const { error } = await supabase
  .from('profiles')
  .update({
    name,
    avatar_url,
    role,
    organization,
    updated_at: new Date().toISOString()
  })
  .eq('id', user.id);

// Upload avatar
const { error } = await supabase.storage
  .from('profile-images')
  .upload(`avatars/${fileName}`, file);
```

## Component Architecture

### Dependencies

- `@/contexts/AuthContext` - User authentication
- `@/components/ui/*` - Design system components
- `@/integrations/supabase/client` - Supabase integration
- `lucide-react` - Icons
- `react-router-dom` - Navigation

### State Management

```typescript
// Form data
const [formData, setFormData] = useState<ProfileData>({...});

// Original data for change detection
const [originalData, setOriginalData] = useState<ProfileData>({...});

// UI states
const [isLoading, setIsLoading] = useState(true);
const [isSaving, setIsSaving] = useState(false);
const [uploadingImage, setUploadingImage] = useState(false);
const [hasChanges, setHasChanges] = useState(false);

// Validation
const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
```

### Key Functions

1. **fetchProfile()** - Loads user profile data
2. **handleInputChange()** - Updates form fields with validation
3. **handleImageChange()** - Processes and uploads profile photos
4. **handleSave()** - Validates and saves profile changes
5. **validateField()** - Inline field validation

## Customization

### Adding New Fields

1. **Update Database Schema**
   ```sql
   ALTER TABLE profiles ADD COLUMN new_field TEXT;
   ```

2. **Update TypeScript Types**
   ```typescript
   // src/integrations/supabase/types.ts
   interface ProfileData {
     // ... existing fields
     new_field: string;
   }
   ```

3. **Add Field to Component**
   ```tsx
   <Input
     name="new_field"
     value={formData.new_field}
     onChange={handleInputChange}
   />
   ```

### Customizing Animations

Modify animation delays in the component:

```tsx
<Card style={{ animationDelay: '0.3s' }}>
  {/* Adjust delay as needed */}
</Card>
```

### Customizing Validation

Add custom validation rules in `validateField()`:

```typescript
case 'new_field':
  if (value.length < 5) return 'Must be at least 5 characters';
  break;
```

## Troubleshooting

### Images Not Uploading

1. Check storage bucket exists and is public
2. Verify RLS policies are enabled
3. Ensure file size is under 5MB
4. Check browser console for errors

### Profile Not Loading

1. Verify user is authenticated
2. Check profiles table has a row for the user
3. Ensure RLS policies allow user to read their profile
4. Check browser console for Supabase errors

### Changes Not Saving

1. Check validation errors in form
2. Verify network connection
3. Check Supabase logs for policy violations
4. Ensure user has UPDATE permission on profiles

## Performance Optimizations

1. **Image Upload**
   - Client-side preview before upload
   - File size validation before upload
   - Optimized file naming for caching

2. **Change Detection**
   - JSON comparison for efficient change tracking
   - Prevents unnecessary API calls

3. **Validation**
   - Inline validation prevents invalid submissions
   - Debounced validation could be added for better UX

## Security Considerations

1. **Row Level Security (RLS)**
   - Users can only read/update their own profiles
   - Enforced at database level

2. **File Upload Security**
   - File type validation
   - File size limits
   - User-specific storage folders

3. **Input Validation**
   - Length limits on all text fields
   - Type validation for all inputs
   - XSS protection via React's built-in escaping

## Future Enhancements

Potential improvements:

1. **Google Profile Sync**
   - Auto-populate from Google OAuth profile
   - Sync avatar from Google account

2. **Advanced Validation**
   - Email format validation for organization emails
   - URL validation for social links

3. **Profile Visibility Settings**
   - Public/private profile toggle
   - Customize what others can see

4. **Activity History**
   - Show last updated timestamp
   - Profile edit history

5. **Multi-factor Authentication**
   - Link to MFA setup
   - Security settings section

## Related Documentation

- [Authentication Setup](./AUTH_README.md)
- [Database Schema](./supabase-schema.sql)
- [Design System Components](./src/components/ui/)
- [API Client](./src/lib/api-client.ts)

## Support

For issues or questions:
1. Check console for errors
2. Review Supabase logs
3. Verify database migration ran successfully
4. Check RLS policies are correctly configured

