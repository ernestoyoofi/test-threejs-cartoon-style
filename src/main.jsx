import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import MainActivity from "./MainActivity.jsx"
import "./globals.css"

createRoot(document.getElementById("root")).render(
  // <StrictMode>
    <MainActivity />
  // </StrictMode>,
)
