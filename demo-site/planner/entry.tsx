import { createRoot } from "react-dom/client";
import { Planner } from "../../src/features/planner/Planner";
import "../../src/styles.css";
const root = document.getElementById("root");
if (!root) throw new Error("The app root is missing.");
createRoot(root).render(<Planner />);
