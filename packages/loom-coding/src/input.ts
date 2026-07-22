import { Input } from "@opentui/core";

export function createInput() {
  return Input({
    placeholder: "Type something...",
    width: 50,
  });
}