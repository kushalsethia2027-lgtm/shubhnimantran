import { createRoot } from "react-dom/client";
import { SocialApp } from "../src/features/social/SocialApp";
import "../src/styles.css";
const root = document.getElementById("root");
if (!root) throw Error("Missing app root");
createRoot(root).render(<SocialApp />);
