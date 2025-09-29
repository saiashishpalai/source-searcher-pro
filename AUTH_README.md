# Haven7 Authentication System

A comprehensive authentication system built for Haven7 with React, TypeScript, and modern UI components.

## Features

### ✅ Complete Authentication Flow
- **Signup Page**: Email, password, confirm password with validation
- **Login Page**: Email, password with "Forgot password" link
- **Password Reset Flow**: Email link → new password form
- **Email Verification**: Required before accessing main app
- **Session Management**: Persistent login state
- **Protected Routes**: Automatic redirects based on auth state

### 🔐 Security Features
- Password hashing with bcryptjs (12 salt rounds)
- JWT token simulation for session management
- Email validation and password strength requirements
- Secure password reset with token expiration
- Protected route guards

### 🎨 Design Integration
- Follows Haven7's existing design patterns
- White text on dark backgrounds
- Clean, modern form designs
- Consistent with existing UI components
- Responsive design for all screen sizes

## File Structure

```
src/
├── contexts/
│   └── AuthContext.tsx          # Authentication context and state management
├── components/
│   ├── ProtectedRoute.tsx       # Route protection component
│   └── UserProfile.tsx         # Updated with logout functionality
├── pages/
│   ├── Login.tsx               # Login page
│   ├── Signup.tsx              # Signup page
│   ├── ForgotPassword.tsx      # Password reset request
│   ├── ResetPassword.tsx       # Password reset form
│   ├── VerifyEmail.tsx         # Email verification
│   └── ConnectSources.tsx     # Post-verification onboarding
├── lib/
│   └── auth.ts                 # Authentication utilities
└── App.tsx                     # Updated with auth routes
```

## Authentication Flow

### 1. User Registration
```
/signup → Email verification → /verify-email → /connect-sources → /
```

### 2. User Login
```
/login → / (if verified) or /verify-email (if not verified)
```

### 3. Password Reset
```
/forgot-password → Email sent → /reset-password?token=xxx → /login
```

## Key Components

### AuthContext
- Centralized authentication state management
- User session persistence
- Login/logout functionality
- Email verification handling
- Password reset operations

### ProtectedRoute
- Route protection based on authentication status
- Optional email verification requirement
- Automatic redirects to appropriate pages
- Loading states during auth checks

### Form Validation
- Email format validation
- Password strength requirements (8+ chars, uppercase, lowercase, numbers)
- Password confirmation matching
- Real-time validation feedback

## Security Considerations

### Password Security
- Passwords are hashed using bcryptjs with 12 salt rounds
- Password strength validation on frontend
- Secure password reset with token expiration

### Session Management
- JWT token simulation (ready for backend integration)
- Local storage for session persistence
- Automatic logout on token expiration
- Secure token handling

### Route Protection
- All main app routes require authentication
- Email verification required for full access
- Automatic redirects to appropriate pages
- Loading states during auth checks

## Usage

### Basic Authentication
```tsx
import { useAuth } from '@/contexts/AuthContext';

const MyComponent = () => {
  const { user, login, logout, isLoading } = useAuth();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    <div>
      {user ? (
        <div>Welcome, {user.email}!</div>
      ) : (
        <div>Please log in</div>
      )}
    </div>
  );
};
```

### Protected Routes
```tsx
import ProtectedRoute from '@/components/ProtectedRoute';

// Basic protection
<ProtectedRoute>
  <MyComponent />
</ProtectedRoute>

// With email verification requirement
<ProtectedRoute requireVerification={true}>
  <MyComponent />
</ProtectedRoute>
```

## Backend Integration

The authentication system is designed to be easily integrated with a backend:

### Required Backend Endpoints
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/verify-email` - Email verification
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset confirmation
- `GET /api/auth/me` - Get current user

### Environment Variables
```env
JWT_SECRET=your_jwt_secret_here
BCRYPT_SALT_ROUNDS=12
EMAIL_SERVICE_API_KEY=your_email_service_key
```

## Customization

### Styling
All components use Tailwind CSS classes and can be customized by modifying the component files. The design follows Haven7's existing patterns with:
- Dark theme with white text
- Glassmorphism effects
- Consistent spacing and typography
- Responsive design

### Validation Rules
Password and email validation can be customized in `/src/lib/auth.ts`:
- Password strength requirements
- Email format validation
- Custom validation rules

## Testing

The authentication system includes:
- Form validation testing
- Route protection testing
- Session management testing
- Error handling testing

## Future Enhancements

- Social OAuth integration (Google, GitHub, etc.)
- Two-factor authentication
- Advanced password policies
- Account lockout after failed attempts
- Email templates customization
- Audit logging

## Dependencies

- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT token handling (for backend)
- `react-router-dom` - Routing and navigation
- `@tanstack/react-query` - Data fetching and caching
- `lucide-react` - Icons
- `@radix-ui/*` - UI components

## Getting Started

1. Install dependencies:
```bash
npm install bcryptjs jsonwebtoken @types/bcryptjs @types/jsonwebtoken
```

2. The authentication system is ready to use with the existing Haven7 application.

3. For production, integrate with your backend API endpoints.

## Support

For questions or issues with the authentication system, please refer to the Haven7 documentation or contact the development team.
