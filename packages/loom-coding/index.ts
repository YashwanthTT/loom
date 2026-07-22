import {createCliRenderer,  Text,} from "@opentui/core";

import { createInput } from "./src/input";
import { slashCommands } from "./src/slash-command";

const renderer = await createCliRenderer();

let commandList = "";
for(let i=0;i<5;i=i+1){
   commandList = commandList+slashCommands[i].name+slashCommands[i].description
  }

const commandText = Text({
  content: commandList,
});

const input = createInput();

renderer.root.add(commandText);
renderer.root.add(input);

input.focus();