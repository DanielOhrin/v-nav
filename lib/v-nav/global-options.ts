import { Action, VNavOptions } from "."

const actions: Action[] = [
  new Action({
    id: "expand",
    name: "Expand",
    keys: ["Space"],
    description: "Open/close expandable elements"
  }),
  new Action({
    id: "open",
    name: "Open",
    keys: [
      {
        code: "ArrowRight",
        shiftKey: false
      },
      {
        code: "Enter",
        shiftKey: false
      }
    ],
    description: "Open an object"
  }),
  new Action({
    id: "drillin",
    name: "Drill In",
    keys: [
      {
        code: "ArrowRight",
        shiftKey: true
      },
      {
        code: "Enter",
        shiftKey: true
      }
    ],
    description: "Drill into an object"
  }),
  new Action({
    id: "drillout",
    name: "Drill Out",
    keys: [
      {
        code: "ArrowLeft",
        shiftKey: true
      }
    ],
    description: "Drill out of an object"
  })
]

export const vnavOptions: VNavOptions = {
  actions
}
