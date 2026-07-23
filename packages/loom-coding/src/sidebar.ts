import {
  type CliRenderer,
  type KeyEvent,
  BoxRenderable,
  TextRenderable,
  InputRenderable,
} from "@opentui/core"
import { type Command } from "./command-palette.js"

export interface NavItem {
  id: string
  icon: string
  label: string
  onSelect: () => void
}

export interface SidebarOptions {
  items: NavItem[]
  commands?: Command[]
  expandedWidth?: number
}

export interface SideBar {
  container: BoxRenderable
  toggle: () => void
  destroy: () => void
}

interface SidebarItem {
  id: string
  icon: string
  label: string
  action: () => void
}

export function createSidebar(renderer: CliRenderer, options: SidebarOptions): SideBar {
  const expandedWidth = options.expandedWidth ?? 24
  let expanded = true
  let selectedIndex = 0

  const allItems: SidebarItem[] = [
    ...options.items.map((item) => ({
      id: item.id,
      icon: item.icon,
      label: item.label,
      action: item.onSelect,
    })),
    ...(options.commands ?? []).map((cmd) => ({
      id: cmd.id,
      icon: "⚡",
      label: cmd.label,
      action: cmd.action,
    })),
  ]

  let filteredItems = [...allItems]

  // ---- FLOATING TOGGLE BUTTON (collapsed state) ----
  const toggleButton = new BoxRenderable(renderer, {
    id: "sidebar-toggle-btn",
    width: 5,
    height: 3,
    alignItems: "center",
    justifyContent: "center",
    borderStyle: "rounded",
    border: true,
    borderColor: "#8b5cf6",
    backgroundColor: "#0f172a",
    zIndex: 100,
  })

  const toggleIcon = new TextRenderable(renderer, {
    id: "sidebar-toggle-icon",
    content: "≡",
    fg: "#a78bfa",
  })

  toggleButton.add(toggleIcon)
  toggleButton.onMouse = (event) => {
    if (event.type === "down") toggleSideBar()
  }
  toggleButton.onMouseOver = () => {
    toggleButton.backgroundColor = "#1e293b"
    toggleIcon.fg = "#c4b5fd"
  }
  toggleButton.onMouseOut = () => {
    toggleButton.backgroundColor = "#0f172a"
    toggleIcon.fg = "#a78bfa"
  }

  // ---- EXPANDED SIDEBAR ----
  const container = new BoxRenderable(renderer, {
    id: "sidebar-root",
    width: expandedWidth,
    height: "auto",
    flexDirection: "column",
    borderStyle: "rounded",
    border: true,
    borderColor: "#8b5cf6",
    backgroundColor: "#0f172a",
    paddingLeft: 1,
    paddingRight: 1,
  })

  // ---- HEADER ----
  const headerRow = new BoxRenderable(renderer, {
    id: "sidebar-header",
    width: "100%",
    height: 3,
    alignItems: "center",
    backgroundColor: "transparent",
  })

  const headerText = new TextRenderable(renderer, {
    id: "sidebar-header-text",
    content: "≡ Loom",
    fg: "#a78bfa",
  })

  headerRow.add(headerText)
  headerRow.onMouse = (event) => {
    if (event.type === "down") toggleSideBar()
  }
  headerRow.onMouseOver = () => {
    headerRow.backgroundColor = "#1e293b"
  }
  headerRow.onMouseOut = () => {
    headerRow.backgroundColor = "transparent"
  }

  // ---- INPUT ----
  const input = new InputRenderable(renderer, {
    id: "sidebar-input",
    placeholder: "Type a command...",
    width: "auto",
    backgroundColor: "transparent",
    textColor: "#f1f5f9",
    placeholderColor: "#64748b",
  })

  const inputBox = new BoxRenderable(renderer, {
    id: "sidebar-input-box",
    width: "100%",
    height: 3,
    borderStyle: "rounded",
    border: true,
    borderColor: "#334155",
    paddingLeft: 1,
  })
  inputBox.add(input)

  // ---- ITEMS (icon LEFT of text) ----
  const navBox = new BoxRenderable(renderer, {
    id: "sidebar-nav",
    width: "100%",
    height: "auto",
    flexDirection: "column",
  })

  const itemRows: Array<{
    row: BoxRenderable
    icon: TextRenderable
    label: TextRenderable
    item: SidebarItem
  }> = []

  for (const item of allItems) {
    const icon = new TextRenderable(renderer, {
      id: `sidebar-icon-${item.id}`,
      content: `${item.icon} `,
      fg: "#64748b",
    })

    const label = new TextRenderable(renderer, {
      id: `sidebar-label-${item.id}`,
      content: item.label,
      fg: "#cbd5e1",
    })

    const row = new BoxRenderable(renderer, {
      id: `sidebar-row-${item.id}`,
      width: "100%",
      height: 3,
      flexDirection: "row",
      alignItems: "center",
      backgroundColor: "transparent",
    })

    row.add(icon)
    row.add(label)

    row.onMouse = (event) => {
      if (event.type === "down") item.action()
    }
    row.onMouseOver = () => {
      row.backgroundColor = "#1e293b"
      icon.fg = "#a78bfa"
      label.fg = "#f1f5f9"
    }
    row.onMouseOut = () => {
      row.backgroundColor = "transparent"
      icon.fg = "#64748b"
      label.fg = "#cbd5e1"
    }

    navBox.add(row)
    itemRows.push({ row, icon, label, item })
  }

  container.add(headerRow)
  container.add(inputBox)
  container.add(navBox)

  renderer.root.add(toggleButton)
  renderer.root.add(container)

  // ---- FILTER & SELECTION ----
  function updateView() {
    for (const { row, icon, label, item } of itemRows) {
      const visible = filteredItems.includes(item)
      const idx = filteredItems.indexOf(item)
      const selected = idx === selectedIndex && visible

      row.visible = visible
      if (visible) {
        icon.fg = selected ? "#a78bfa" : "#64748b"
        label.fg = selected ? "#f1f5f9" : "#cbd5e1"
        row.backgroundColor = selected ? "#1e293b" : "transparent"
      }
    }
  }

  function updateFilter(value: string) {
    const query = value.toLowerCase()
    filteredItems = allItems.filter((item) =>
      item.label.toLowerCase().includes(query)
    )
    selectedIndex = 0
    updateView()
  }

  // ---- INPUT KEY HANDLING ----
  input.onKeyDown = (key: KeyEvent) => {
    if (!expanded) return

    if (key.name === "up") {
      selectedIndex = Math.max(0, selectedIndex - 1)
      updateView()
      return
    }

    if (key.name === "down") {
      selectedIndex = Math.min(filteredItems.length - 1, selectedIndex + 1)
      updateView()
      return
    }

    if (key.name === "return" || key.name === "linefeed") {
      const item = filteredItems[selectedIndex]
      if (item) item.action()
      return
    }

    if (key.name === "escape") {
      input.value = ""
      updateFilter("")
      input.blur()
      return
    }

    if (key.name === "backspace" || key.name === "delete") {
      updateFilter(input.value)
      return
    }

    updateFilter(input.value)
  }

  input.onSubmit = () => {
    const item = filteredItems[selectedIndex]
    if (item) item.action()
  }

  // ---- TOGGLE ----
  function toggleSideBar() {
    expanded = !expanded
    container.visible = expanded
    toggleButton.visible = !expanded
    if (expanded) {
      input.value = ""
      updateFilter("")
      input.focus()
    }
  }

  function onKeyPress(key: KeyEvent) {
    if (key.ctrl && key.name === "b") {
      toggleSideBar()
    }
  }

  renderer.keyInput.on("keypress", onKeyPress)

  function destroy() {
    renderer.keyInput.off("keypress", onKeyPress)
    renderer.root.remove(container)
    renderer.root.remove(toggleButton)
  }

  return {
    container,
    toggle: toggleSideBar,
    destroy,
  }
}
