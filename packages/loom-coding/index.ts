import { createCliRenderer } from "@opentui/core"
import { createSidebar } from "./src/sidebar.js"

const renderer = await createCliRenderer()

const sidebar = createSidebar(renderer, {
  items: [
    { id: "dashboard", icon: "▣", label: "Dashboard", onSelect: () => console.log("dashboard") },
    { id: "agents", icon: "⚙", label: "Agents", onSelect: () => console.log("agents") },
    { id: "logs", icon: "≡", label: "Logs", onSelect: () => console.log("logs") },
  ],
  commands: [
    { id: "run-tests", label: "Run Tests", description: "Trigger the Tester agent", action: () => console.log("running tests") },
  ],
})

renderer.root.add(sidebar.container)
