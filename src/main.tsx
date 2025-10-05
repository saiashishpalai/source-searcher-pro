import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { validateEnvVariables } from "./lib/env-validation";
import { logOAuthStatus } from "./lib/oauth-env-validator";

// Validate environment variables early
validateEnvVariables();
logOAuthStatus();

createRoot(document.getElementById("root")!).render(<App />);
