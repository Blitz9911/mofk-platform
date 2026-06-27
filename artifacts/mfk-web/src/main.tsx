import "./lib/supabase-api-bridge";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthProvider } from "./contexts/AuthContext";

createRoot(document.getElementById("root")!).render(
  <AuthProvider>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </AuthProvider>
);
