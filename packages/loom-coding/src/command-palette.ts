import {
  type CliRenderer,
  type KeyEvent,
  BoxRenderable,
  InputRenderable,
  SelectRenderable,
  type SelectOption,
} from "@opentui/core"

export interface Command {
  id: string
  label: string
  description?: string
  action: () => void
}

export interface CommandPalette {
  container: BoxRenderable
  open: () => void
  close: () => void
  isOpen: () => boolean
  destroy: () => void
}

export function createCommandPalette(renderer: CliRenderer, commands: Command[]): CommandPalette {
  let allCommands = commands
  let isOpen = false

  const width = 60
  const height = 14
  const container = new BoxRenderable(renderer, {
    id: "command-palette",
    width,
    height,
    position: "absolute",
    left: Math.floor((renderer.terminalWidth - width) / 2),
    top: Math.floor((renderer.terminalHeight - height) / 3),
    zIndex: 1000,
    borderStyle: "rounded",
    border: true,
    borderColor: "#8b5cf6",
    backgroundColor: "#0f172a",
    flexDirection: "column",
    visible: false,
  })

  const inputBox = new BoxRenderable(renderer, {
    id: "command-palette-input-box",
    width: "auto",
    height: 3,
    borderStyle: "rounded",
    border: true,
    borderColor: "#334155",
  })

  const input = new InputRenderable(renderer, {
    id: "command-palette-input",
    placeholder: "Type a command...",
    width: "auto",
    backgroundColor: "transparent",
    textColor: "#f1f5f9",
    placeholderColor: "#64748b",
  })

  const list = new SelectRenderable(renderer, {
    id: "command-palette-list",
    width: "auto",
    height: "auto",
    flexGrow: 1,
    options: toOptions(allCommands),
    backgroundColor: "transparent",
    selectedBackgroundColor: "#8b5cf6",
    selectedTextColor: "#ffffff",
    textColor: "#cbd5e1",
    descriptionColor: "#64748b",
    showDescription: true,
    wrapSelection: true,
  })

  inputBox.add(input)
  container.add(inputBox)
  container.add(list)
  renderer.root.add(container)

  input.onSubmit = () => {
    runSelected()
  }

  input.onKeyDown = (key: KeyEvent) => {
    if (!isOpen) return

    if (key.name === "up" || key.name === "down" || key.name === "escape" || key.name === "return" || key.name === "linefeed") {
      return
    }

    if (key.name === "backspace" || key.name === "delete") {
      updateFilter(input.value)
      return
    }

    updateFilter(input.value)
  }

  function toOptions(cmds: Command[]): SelectOption[] {
    return cmds.map((command) => ({
      name: command.label,
      description: command.description ?? "",
      value: command.id,
    }))
  }

  function updateFilter(value: string): void {
    const query = value.toLowerCase()
    const filtered = allCommands.filter((command) => command.label.toLowerCase().includes(query))
    list.options = toOptions(filtered)
    if (filtered.length > 0) {
      list.setSelectedIndex(0)
    }
  }

  function runSelected() {
    const chosen = list.getSelectedOption()
    if (!chosen) return

    const command = allCommands.find((item) => item.id === chosen.value)
    command?.action()
    closePalette()
  }

  function onKeyPress(key: KeyEvent) {
    if (!isOpen) return

    if (key.name === "escape") {
      closePalette()
      return
    }

    if (key.name === "up") {
      list.moveUp()
      return
    }

    if (key.name === "down") {
      list.moveDown()
      return
    }

    if (key.name === "return" || key.name === "linefeed") {
      runSelected()
    }
  }

  renderer.keyInput.on("keypress", onKeyPress)

  function openPalette() {
    isOpen = true
    container.visible = true
    input.value = ""
    updateFilter("")
    input.focus()
  }

  function closePalette() {
    isOpen = false
    container.visible = false
    input.blur()
  }

  function destroy() {
    renderer.keyInput.off("keypress", onKeyPress)
    renderer.root.remove(container)
  }

  return {
    container,
    open: openPalette,
    close: closePalette,
    isOpen: () => isOpen,
    destroy,
  }
}


