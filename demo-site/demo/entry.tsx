import { createRoot } from "react-dom/client";
import { DemoStudio } from "../../src/features/demo/DemoStudio";
import "../../src/styles.css";
const root = document.getElementById("root");
if (!root) throw new Error("The app root is missing.");
createRoot(root).render(<DemoStudio standalone />);
