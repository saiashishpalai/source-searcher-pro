import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import ConnectSources from "./pages/ConnectSources";
import ConnectedSources from "./pages/ConnectedSources";
import ProfileSettings from "./pages/ProfileSettings";
import Documentation from "./pages/Documentation";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";

const App = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/connect-sources" element={
        <ProtectedRoute requireVerification={true}>
          <ConnectSources />
        </ProtectedRoute>
      } />
      <Route path="/connected-sources" element={
        <ProtectedRoute>
          <ConnectedSources />
        </ProtectedRoute>
      } />
      <Route path="/profile-settings" element={
        <ProtectedRoute>
          <ProfileSettings />
        </ProtectedRoute>
      } />
      <Route path="/docs" element={<Documentation />} />
      
      {/* Catch-all route */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default App;
