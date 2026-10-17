import { createRoot } from "react-dom/client";
import { Landing } from "../src/features/landing/Landing";
import "../src/styles.css";
const root = document.getElementById("root");
if (!root) throw new Error("The app root is missing.");
createRoot(root).render(<Landing standalone />);
