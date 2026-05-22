import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n/config"; // <--- أضف هذا السطر فقط!

createRoot(document.getElementById("root")!).render(<App />);