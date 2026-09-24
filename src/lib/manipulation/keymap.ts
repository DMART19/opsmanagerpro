/** The single canonical control map for BOTH 3D builders. */
export const MANIPULATION_KEYMAP: { keys: string; action: string }[] = [
  { keys: "Left click", action: "Select object" },
  { keys: "Drag", action: "Move object" },
  { keys: "Shift + click", action: "Add to selection" },
  { keys: "Right mouse", action: "Orbit camera" },
  { keys: "Middle mouse", action: "Pan camera" },
  { keys: "Mouse wheel", action: "Zoom" },
  { keys: "Shift + wheel", action: "Raise / lower selection" },
  { keys: "W", action: "Move mode" },
  { keys: "E", action: "Rotate mode" },
  { keys: "R", action: "Vertical move mode" },
  { keys: "F", action: "Focus selection" },
  { keys: "Double click", action: "Focus object" },
  { keys: "Home", action: "Reset camera" },
  { keys: "Delete", action: "Delete selection" },
  { keys: "Ctrl+Z / Ctrl+Shift+Z", action: "Undo / Redo" },
  { keys: "Esc", action: "Clear selection" },
];
