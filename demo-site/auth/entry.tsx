import { createRoot } from "react-dom/client";
import { GoogleCallback } from "../../src/features/auth/GoogleCallback";
import "../../src/styles.css";
const root = document.getElementById("root");
if (!root) throw new Error("Missing app root");
createRoot(root).render(<GoogleCallback />);
