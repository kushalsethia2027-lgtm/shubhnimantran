import { createRoot } from "react-dom/client";
import { ProductPage } from "../../src/features/landing/ProductPage";
import "../../src/styles.css";
const root = document.getElementById("root");
if (!root) throw new Error("The app root is missing.");
createRoot(root).render(<ProductPage />);
