import { createCliRenderer, Text } from "@opentui/core";
import { createInput } from "./src/input";
import { slashCommands } from "./src/slash-command";
import { createSideBar } from "./src/sidebar.ts";

const renderer = await createCliRenderer();

// Slash commands
let commandList = "";

for (let i = 0; i < 5; i = i + 1) {
  commandList =
    commandList +
    slashCommands[i].name +
    slashCommands[i].description;
}

const commandText = Text({
  content: commandList,
});

// Sidebar
const sidebar = createSideBar(renderer, {
  subphase: "Phase 0.2 (Auth)",
  iteration: { current: 2, max: 4 },
  steps: [
    { name: "Tester", status: "Passed" },
    { name: "Implementer", status: "Running" },
    { name: "QC", status: "Pending" },
    { name: "Evaluator", status: "Pending" },
  ],
});

sidebar.pushlog("writing patch for auth.py");
sidebar.pushlog("reading the file main.c");

// Input
const input = createInput();

// Render components
renderer.root.add(sidebar.container);
renderer.root.add(commandText);
renderer.root.add(input);

input.focus();