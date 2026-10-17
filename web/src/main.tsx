import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./styles/base.css";
import "./styles/transactions.css";
import "./styles/accounts.css";
import "./styles/connection.css";
import "./styles/credit-cards.css";
import "./styles/reports.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);