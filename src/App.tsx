// OAuth fixes deployed - trigger Vercel redeploy
import { Routes, Route } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import ConnectedSources from "./pages/ConnectedSources";
import ProfileSettings from "./pages/ProfileSettings";
import Documentation from "./pages/Documentation";
import NotFound from "./pages/NotFound";
import Waitlist from "./pages/Waitlist";
import WaitlistDashboard from "./pages/admin/WaitlistDashboard";
import PRDList from "./components/PRDList";
import PRDView from "./pages/PRDView";
import PRDNew from "./pages/PRDNew";
import PRDHubPage from "./pages/PRDHubPage";
import PRDCompare from "./components/PRDCompare";
import PRDExecution from "./pages/PRDExecution";

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
      <Route path="/waitlist" element={<Waitlist />} />
      <Route path="/admin/waitlist" element={<WaitlistDashboard />} />
      
      {/* Protected routes */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <Index />
        </ProtectedRoute>
      } />
      <Route path="/connect-sources" element={
        <ProtectedRoute requireVerification={true}>
          <ConnectedSources />
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
      <Route path="/prds" element={
        <ProtectedRoute>
          <PRDHubPage />
        </ProtectedRoute>
      } />
      <Route path="/prd/new" element={
        <ProtectedRoute>
          <PRDNew />
        </ProtectedRoute>
      } />
      <Route path="/prd/:id" element={
        <ProtectedRoute>
          <PRDView />
        </ProtectedRoute>
      } />
      <Route path="/prd/compare/:id1/:id2" element={
        <ProtectedRoute>
          <PRDCompare />
        </ProtectedRoute>
      } />
      <Route path="/prd/:id/execution" element={
        <ProtectedRoute>
          <PRDExecution />
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
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
