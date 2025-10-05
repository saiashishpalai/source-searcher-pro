import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { validateEnvVariables } from "./lib/env-validation";

// Validate environment variables early
validateEnvVariables();

createRoot(document.getElementById("root")!).render(<App />);
