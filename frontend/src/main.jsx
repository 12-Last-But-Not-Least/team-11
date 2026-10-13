import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./tokens.css";
import "./App.css";
// Shared with canvas_svg_demo.html; both attach to window (InteractiveChart, SvgChart).
import "../../interactive.js";
import "../../svg_export.js";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
