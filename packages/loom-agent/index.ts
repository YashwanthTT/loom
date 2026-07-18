import { createCliRenderer, Input } from "@opentui/core"

const renderer = await createCliRenderer()

const input = Input({
  placeholder: "Type something...",
  width: 30,
})

input.focus()
renderer.root.add(input)
