import { createCliRenderer, Input } from "@opentui/core"
import { createSideBar } from "./src/sidebar.ts"
const renderer = await createCliRenderer()
const sidebar = createSideBar(renderer, {
  subphase: "Phase 0.2 (Auth)",
  iteration: { current: 2, max: 4 },
  steps: [
    { name: "Tester", status: "Passed" },
    { name: "Implementer", status: "Running" },
    { name: "QC", status: "Pending" },
    { name: "Evaluator", status: "Pending" },
  ],
})
renderer.root.add(sidebar.container)
 //ex
 sidebar.pushlog("writing patch for auth.py")
 sidebar.pushlog("reading the file main.c")
