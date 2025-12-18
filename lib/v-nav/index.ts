import {
  App,
  DirectiveBinding,
  DirectiveHook,
  ObjectDirective,
  VNode
} from "vue"
import "./vnav.scss"
import { Str } from "@mellow.cobra/lib"
import { AnyFunction } from "@mellow.cobra/lib/dist/function"

// For future expansion, could add an optional namespace/group name field
// so we can have repeated keybinds that do different things or at least different names/descriptions for the same keys
export class Action implements IAction {
  readonly id: string
  readonly name: string
  readonly description: string
  readonly keys: Key[]
  readonly cb

  constructor({ id, name, keys, cb, description: desc }: IAction) {
    this.name = name
    this.id = id
    this.description = desc
    this.keys = keys.map((x) => (typeof x === "string" ? { code: x } : x))
    this.cb =
      cb ||
      (() => {
        throw new Error("Callback not defined for action: " + id)
      })
  }
}

//#region Types

/**
 * Interface used to expose public properties from {@link VNavDirective}
 */
export interface VNav {
  /**
   * @prop
   * Current element focused by the {@linkcode VNavDirective._pointer pointer}
   */
  readonly current: VNavElement | null

  /**
   * @prop
   * Current group based on the {@linkcode VNavDirective._pointer pointer}
   */
  readonly group: string | null

  /**
   * @prop
   * Current index based on the {@linkcode VNavDirective._pointer pointer}
   */
  readonly index: number

  /**
   * Looks up the node in the {@linkcode VNavDirective._nodeMap Map} and returns its group
   * @returns Group of the node or null if not found
   */
  getGroup(node: VNode): string | null

  /**
   * Looks up the node in the {@linkcode VNavDirective._nodeMap Map} and returns its index
   * @param node {@linkcode VNode} to search for
   * @param group Group to search in. If null, will search every group
   * @returns Index of the node, or -1 if not found
   */
  indexOf(node: VNode, group?: string | null): number

  /**
   * Decrements the {@linkcode VNavDirective._pointer pointer}'s index
   * @param amount How much to decrement the pointer
   */
  movePrevious(amount?: number): void

  /**
   * Increments the {@linkcode VNavDirective._pointer pointer}'s index
   * @param amount How much to increment the pointer
   */
  moveNext(amount?: number): void

  /**
   * Unfocuses the currently pointed at element if it exists
   */
  unfocus(): void

  /**
   * Updates the pointer and focuses the newly pointed at {@linkcode VNavElement}
   * @param group Group of the element
   * @param i Index of the element
   */
  focus(group: string, i: number): void
}

/**
 * Pointer used in {@linkcode VNav} to keep track of the focused {@linkcode VNode}'s group and index
 * @see {@linkcode VNavDirective._pointer usage}
 */
export interface VNavPointer {
  /**
   * Key in the VNav's {@linkcode VNavDirective._nodeMap Map }
   * **null** if none in focus
   */
  group: string | null

  /**
   * Index of the current focused {@linkcode VNavElement} in the VNav's {@linkcode VNavDirective._nodeMap Map}
   * **-1** if none in focus
   */
  i: number
}

/**
 * Options used when installing the {@linkcode VNav} plugin
 * @example
 * ```ts
 * app.use(VNav, {
 *  actions: [
 *    new Action({
 *      id: "movedown",
 *      description: "Navigate down"
 *      keys: ["ArrowDown"],
 *      cb: (e, vnav) => vnav.moveNext(e.shiftKey ? 10 : 1)
 *    })
 *  ]
 * }
 * ```
 */
export interface VNavOptions {
  /**
   * @field
   * Actions available to the {@linkcode VNav} plugin
   */
  actions: Action[]

  /**
   * @field
   * Whether to remove the default actions provided by the plugin
   */
  removeDefaultActions?: boolean
}

/**
 * Wrapper for VNode that contains extra data needed for VNav functionality
 * @see {@linkcode VNavDirective.mounted}
 */
export type VNavElement = {
  /**
   * @prop
   * Unique identifier for the VNavElement
   * @see {@linkcode VNavBinding.key VNavBinding}
   */
  key: string

  /**
   * @prop
   * Underlying {@linkcode VNode} that is being wrapped
   */
  node: VNode

  /**
   * @prop
   * {@linkcode Map} of {@linkcode VNavKeyBind} that wil be searched by action id when the element is focused during a {@linkcode KeyboardEvent}
   */
  keybinds: Map<string, VNavKeyBind>

  /**
   * @prop
   * Previous group(s) to navigate to in {@linkcode VNav} when {@linkcode VNav.pointer} index overflows
   */
  previousGroup?: string[]

  /**
   * @prop
   * The next group(s) to navigate to in {@linkcode VNav} when {@linkcode VNav.pointer} index overflows
   */
  nextGroup?: string[]

  /**
   * @prop
   * Order of the {@linkcode VNavElement} in the {@linkcode VNav} group. If undefined, the {@linkcode VNavElement} is pushed to the end of the group.
   */
  i?: number

  /**
   * @prop
   * Callback that is called immediately BEFORE the element is focused
   */
  onFocus?: AnyFunction
}

/**
 * Data representation of a Keypress for VNav to use
 */
export interface Key {
  /**
   * Keycode: i.e. "ArrowUp"
   */
  code: string
  /**
   * False: Only activate if false
   * True: Only activate if true
   * undefined: Activate unless a more specific keybind is present (i.e. same code but cntrlKey: true/false)
   */
  ctrlKey?: boolean
  /**
   * False: Only activate if false
   * True: Only activate if true
   * undefined: Activate unless a more specific keybind is present (i.e. same code but cntrlKey: true/false)
   */
  shiftKey?: boolean
  /**
   * False: Only activate if false
   * True: Only activate if true
   * undefined: Activate unless a more specific keybind is present (i.e. same code but cntrlKey: true/false)
   */
  altKey?: boolean
}

interface IAction {
  /**
   * @field
   * Readable name that represents the action
   */
  name: string
  /**
   * @field
   * Unique ID used to identify the action
   */
  id: string
  /**
   * @field
   * Keys that activate the action
   *
   */
  keys: (Key | string)[]
  description: string
  cb?: (e: KeyboardEvent, vnav: VNav) => any
}

/**
 * Defines a Keybind for use with the {@linkcode VNav} directive
 * @see {@linkcode VNavDirective.handleKeyboardEvent usage}
 */
export interface VNavKeyBind {
  /**
   * @prop
   * Id of the {@linkcode Action}
   */
  action: string

  /**
   * @prop
   * Whether the keybind should allow the {@linkcode KeyboardEvent}'s default behavior
   */
  defaultBehavior?: boolean

  /**
   * Override function called when the {@linkcode Action} is activated
   * @param e {@linkcode KeyboardEvent} instance
   * @param vnav {@linkcode VNav} instance
   */
  cb?: (e: KeyboardEvent, vnav: VNav) => any
}

/**
 * Interface for passing **binding.value** into v-nav directive
 * @see {@link https://vuejs.org/guide/reusability/custom-directives/#directive-hooks Directive Hooks}
 */
export interface VNavBinding {
  /**
   * @prop
   * Unique identifier used to track the VNode across its lifecycle
   */
  key: string

  /**
   * @prop
   * Order of the {@linkcode VNavElement} in the {@linkcode VNav} group. If undefined, the {@linkcode VNavElement} is pushed to the end of the group.
   */
  i?: number

  /**
   * @prop
   * Subgroup that is appened to the v-nav's **binding.arg** to create a more specific group in state @see {@linkcode VNavBinding}
   */
  subgroup?: string

  /**
   * @prop
   * Array of keybinds that are called when {@linkcode KeyboardEvent} happens while the element is focused
   */
  keybinds?: VNavKeyBind[]

  /**
   * @prop
   * Callback that is called immediately BEFORE the element is focused
   */
  onFocus?: AnyFunction

  /**
   * @prop
   * Previous group to navigate to in {@linkcode VNav} when {@linkcode VNav.pointer} index overflows
   */
  previousGroup?: string | string[]

  /**
   * @prop
   * The next group to navigate to in {@linkcode VNav} when {@linkcode VNav.pointer} index overflows
   */
  nextGroup?: string | string[]
}

//#endregion

//#region Defaults

/**
 * Default keybinds that are automatically put on every {@linkcode VNavElement} unless overridden in the {@linkcode VNavOptions} or {@linkcode VNavBinding}
 */
export const defaults = Object.freeze({
  actions: [
    new Action({
      id: "moveup",
      name: "Move Up",
      keys: ["ArrowUp"],
      description: "Navigate up",
      cb: (e, vnav) => vnav.movePrevious(e.shiftKey ? 10 : 1)
    }),
    new Action({
      id: "movedown",
      name: "Move Down",
      keys: ["ArrowDown"],
      description: "Navigate down",
      cb: (e, vnav) => vnav.moveNext(e.shiftKey ? 10 : 1)
    })
  ]
})

//#endregion

//#region Util

/**
 * Checks a VNode for the VNav directive, and returns it's **binding.value** if found.
 * @param node {@linkcode VNode} to check for the {@linkcode VNav} directive
 * @returns The node's {@linkcode VNavBinding} or **null** if the directive is not attached to it
 */
function getVNavBinding(node: VNode): VNavBinding | null {
  const dirs: DirectiveBinding[] = node.dirs || []

  const vnav = dirs.find((x) => x.dir instanceof VNavDirective)

  if (vnav == null) {
    return null
  }

  return vnav.value as VNavBinding
}

/**
 * Checks a number is within an acceptable index range based on the specified max
 * @param i Desired number
 * @param max (Exclusive) max number in the range
 * @returns Closest number in-bounds
 */
function ensureIndexInBounds(i: number, max: number): number {
  return Math.min(max - 1, Math.max(0, i))
}

/**
 * Manually checks a value to confirm it is a VNavKeyBind
 * @param value Supposed keybind
 * @returns Whether the value is a VNavKeyBind
 */
function isVNavKeyBind(value: VNavKeyBind): value is VNavKeyBind {
  const { action, defaultBehavior: db = false, cb = () => ({}) } = value

  // callback is present AND string
  if (typeof cb !== "function") return false

  // action (id) is present AND string
  if (!Str.isString(action)) return false

  // defaultBehavior is boolean IF present
  if (typeof db !== "boolean") return false

  // Valid keybind!
  return true
}

/**
 * Manually checks a value to confirm it is a VNavBinding
 * @param value Supposed VNavBinding
 * @returns Whether the value is a VNavBinding
 */
function isVNavBinding(value: VNavBinding): value is VNavBinding {
  const {
    key,
    subgroup = "",
    keybinds = [],
    i = -1,
    previousGroup: prev = "",
    nextGroup: next = "",
    onFocus
  } = value

  // key present AND string
  if (!Str.isString(key)) return false

  // i number IF present
  if (isNaN(i)) return false

  // subgroup string IF present
  if (!Str.isString(subgroup)) return false

  // keybinds Array<VNavKeyBind> IF present
  if (!Array.isArray(keybinds) || !keybinds.every(isVNavKeyBind)) return false

  // previousGroup valid
  if (!isValidGroup(prev)) return false

  // nextGroup valid
  if (!isValidGroup(next)) return false

  // onFocus valid
  if (onFocus != null && typeof onFocus !== "function") return false

  // All checks passed! Valid VNavBinding!!
  return true
}

/**
 * Manually checks a value to confirm it is a valid type for prev/next {@linkcode VNavBinding.previousGroup group}
 * @param value Supposed group
 * @returns Whether the value is valid type
 */
function isValidGroup(
  group: string | string[] | undefined
): group is string | string[] | undefined {
  // If group is null/undefined
  if (group == null) return true

  // If group is string
  if (Str.isString(group)) return true

  // If group is Array<string>
  if (Array.isArray(group) && group.every(Str.isString)) return true

  // Invalid group
  return false
}

/**
 * Throws an error if invalid VNavBinding is passed as an argument
 * @param value VNavBinding value to check
 */
function validateVNavBinding(value: VNavBinding): void {
  if (!isVNavBinding(value)) {
    throw new TypeError("value could not be parsed as VNavBinding", {
      cause: value
    })
  }
}

//#endregion

//#region Directive

/**
 * {@linkcode ObjectDirective} singleton that is instantiated when the plugin is installed
 *
 * @description
 * Class that handles all state management and logic for the VNav plugin.
 * A single object is created on install, and referenced every time the directive is used on an element.
 *
 * For more information: {@link https://vuejs.org/guide/reusability/custom-directives Custom Directives}
 */
class VNavDirective implements ObjectDirective<any, VNavBinding>, VNav {
  /**
   * Currently mounted {@linkcode VNavElement VNavElements} separated by groups
   *
   * @see {@linkcode VNavElementMap}
   */
  private _nodeMap: VNavElementMap<string>

  /**
   * @prop
   * Points at the currently focused element if it exists in the {@linkcode VNavDirective._nodeMap Map}
   */
  private _pointer: VNavPointer

  /**
   * @readonly
   * All actions available to {@linkcode VNavElement VNavElements}
   */
  readonly actions: Map<Key, Action>

  constructor(actions: Map<Key, Action>) {
    this._nodeMap = new VNavElementMap<string>()
    this._pointer = {
      group: null,
      i: -1
    }
    this.actions = actions
  }

  //#region Getters

  /**
   * @prop
   * Current {@linkcode VNavElement} based on the {@linkcode VNavDirective._pointer pointer}
   */
  public get current(): VNavElement | null {
    const { group, i } = this._pointer

    if (group == null || i === -1) {
      return null
    }

    return this._nodeMap.get(group)?.at(i) || null
  }

  public get group(): string | null {
    return this._pointer.group
  }

  public get index(): number {
    return this._pointer.i
  }

  //#endregion

  //#region Private Methods

  /**
   * Adds necessary scaffolding/structure to a VNode to work with VNav
   * @param node {@linkcode VNode} to scaffold
   */
  private _scaffoldVNode(node: VNode): void {
    const el = node.el

    if (el == null) return

    if (!el.classList.contains("vnav-element")) {
      el.classList.add("vnav-element")
    }
    el.tabIndex = 0
  }

  /**
   * Strips a VNode of all existing VNav scaffolding
   * @param node {@linkcode VNode} to un-scaffold
   */
  private _unScaffoldVNode(node: VNode): void {
    const el = node.el

    if (el == null) return

    el.classList.remove("vnav-element")
  }

  private _getVNode(el: HTMLElement): VNode | null {
    return this._nodeMap.getVNode(el)
  }

  //#region Overflow Logic

  /**
   * Checks a group to see if it exists and has at least one rendered node
   * @param group Group to check
   * @returns Whether the group has rendered node(s)
   */
  private _isRenderedGroup(group: string) {
    const nodes = this._nodeMap.get(group)

    return nodes != null && nodes.length > 0
  }

  /**
   * Finds the next valid adjacent group in the el, or the last one
   * @param el VNavElement whose group you want to retrieve
   * @param nextGroup False = previousGroup, True (default) = nextGroup
   * @returns Adjacent group as string | null
   */
  private _getAdjacentGroup(el?: VNavElement, nextGroup = true) {
    if (el == null) return null

    const groups = nextGroup ? el.nextGroup : el.previousGroup

    // First valid group OR last group OR null
    return (
      groups?.find(this._isRenderedGroup.bind(this)) || groups?.at(-1) || null
    )
  }

  /**
   * Handles overflowing indeces for moving between navigation items/groups
   * @param group Originating group
   * @param i Desired index
   * @param groups Optional Ordered list of groups to overflow into
   * @returns [group, index] as close to in-bounds as possible
   */
  private _handleOverflow(
    group: string,
    i: number,
    groups?: string[] | undefined
  ): [string, number] {
    // TODO See if this logic can be cleaned up/shortened...
    if (groups == null || groups.includes(group)) {
      let _g = group
      let nodes = this._nodeMap.get(group)
      let prevGroup = groups
        ? groups[groups.indexOf(_g) - 1]
        : this._getAdjacentGroup(nodes?.at(0), false)

      // Decreasing index
      while (i < 0 && prevGroup != null) {
        if (nodes?.length) {
          group = _g
        }

        _g = prevGroup

        nodes = this._nodeMap.get(_g)

        i += nodes?.length || 0
        prevGroup = groups
          ? groups[groups.indexOf(_g) - 1]
          : this._getAdjacentGroup(nodes?.at(0), false)
      }

      // Increasing index
      let _i = i
      let nextGroup = groups
        ? groups[groups.indexOf(_g) + 1]
        : this._getAdjacentGroup(nodes?.at(-1))

      do {
        // No point in calculating overflow if there are no more groups to iterate
        if (nodes?.length) {
          group = _g
          i = _i

          // Example:
          // i = 10 + 1, length = 11
          // 11 - 1 = 10
          // 10 - 11 = |-1|
          const spaceLeft = nodes.length - 1 - _i

          // No overflow
          if (spaceLeft >= 0 || nextGroup == null) break
          // 1 to 0 for example
          _i = Math.abs(spaceLeft) - 1
        } else if (nextGroup == null) break

        _g = nextGroup

        nodes = this._nodeMap.get(_g)
        nextGroup = groups
          ? groups[groups.indexOf(_g) + 1]
          : this._getAdjacentGroup(nodes?.at(-1))
      } while (i >= 0)
    }

    return [group, i]
  }

  //#endregion Overflow Logic
  //#endregion Private Methods

  //#region Public Methods

  getGroup(node: VNode): string | null {
    return this._nodeMap.getGroup(node)
  }

  indexOf(node: VNode, group?: string | null): number {
    group = group || this._nodeMap.getGroup(node)

    if (group == null) {
      return -1
    }

    const nodes = this._nodeMap.get(group) || []

    return nodes.findIndex((el: VNavElement) => el.node === node)
  }

  movePrevious(amount = 1, groups?: string[]) {
    const { group, i } = this._pointer

    if (group == null || i === -1) return

    this.focus(...this._handleOverflow(group, i - amount, groups))
  }

  moveNext(amount = 1, groups?: string[]) {
    const { group, i } = this._pointer

    if (group == null || i === -1) return

    this.focus(...this._handleOverflow(group, i + amount, groups))
  }

  unfocus() {
    this._pointer = {
      group: null,
      i: -1
    }
  }

  focus(group: string, i: number) {
    const nodes = this._nodeMap.get(group)

    if (nodes == null) return

    i = ensureIndexInBounds(i, nodes.length)

    const vnavEl = nodes[i]

    if (vnavEl == null) return

    const el = vnavEl.node?.el

    if (el != null) {
      this.unfocus()
      vnavEl.onFocus?.()
      el.focus()
      this._pointer.group = group
      this._pointer.i = i
    }
  }
  //#endregion

  //#region Event Handlers

  /**
   * Calls the corresponding {@linkcode Action} if on the currently focused {@linkcode VNavElement}
   * @param e {@linkcode KeyboardEvent} that was called
   */
  handleKeyboardEvent(e: KeyboardEvent) {
    if (this.current == null) return

    // First, check if the current target is an html element and has a bound vnode
    // If not, then we ignore this keyboard event
    const el = e.target
    if (!(el instanceof HTMLElement) || this._getVNode(el) == null) return

    const key = getKeyFromEvent(e)

    // Lookup action for this key. Short circuit if we have none
    const action = getActionForKey(this.actions, key)
    if (action == null) return

    // Look for action on currently focused VNavElement
    const bind = this.current.keybinds.get(action.id)
    if (bind == null) return

    // Prevent default behavior, unless explicitly allowed
    if (!bind.defaultBehavior) {
      e.preventDefault()
    }

    // Gives access to the event AND vnav object
    // call keybind callback if exists... OR action callback
    ;(bind.cb || action.cb)(e, this)
  }

  /**
   * Handles updating the {@linkcode VNavDirective._pointer pointer} dynamically when different elements are focused/unfocuses in the window.
   *
   * Allows
   * {@linkcode VNavElement VNavElements} to be focused/unfocused without explicit rules on navigation to/from them
   * &
   * {@linkcode VNav} work with normal focus methods, such as clicking an element and using tab/shift+tab
   *
   * @param e {@linkcode FocusEvent} that was called
   */
  handleFocusEvent(e: FocusEvent) {
    const el = e.target

    // Short circuit this handler if the target element is
    // - not an HTML element (this covers null as well)
    // - already the same as the current vnode
    if (!(el instanceof HTMLElement) || el === this.current?.node?.el) {
      return
    }

    // Short circuit if the element does not have a corresponding vnode
    // We already know that el is an HTML Element because of the previous check
    const vnode = this._getVNode(el as HTMLElement)
    if (vnode == null) return

    // If the vnode is not part of a group, unfocus and short circuit
    const group = this.getGroup(vnode)
    if (group == null) {
      this.unfocus()
      return
    }

    // If the vnode is within the group,
    // then focus it at its index within the group
    const index = this.indexOf(vnode, group)
    if (index !== -1) {
      this.focus(group, index)
    } else {
      this.unfocus()
    }
  }

  /**
   * Creates a {@linkcode VNavElement} from a {@linkcode VNavBinding}
   */
  private _createVNavElement(node: VNode, binding: VNavBinding): VNavElement {
    const { key, i, keybinds, previousGroup, nextGroup, onFocus } = binding

    const vnavElement: VNavElement = {
      key,
      i,
      node,
      keybinds: new Map<string, VNavKeyBind>(),
      onFocus
    }

    // Defaults can be overridden here on a per-element basis
    keybinds?.forEach((bind) => {
      vnavElement.keybinds.set(bind.action, {
        ...bind,
        defaultBehavior: bind.defaultBehavior || false
      } as VNavKeyBind)
    })

    if (previousGroup)
      vnavElement.previousGroup =
        typeof previousGroup === "string" ? [previousGroup] : previousGroup
    if (nextGroup)
      vnavElement.nextGroup =
        typeof nextGroup === "string" ? [nextGroup] : nextGroup

    return vnavElement
  }
  //#endregion

  //#region Hooks

  /**
   * Called when the VNode is created
   *
   * Handles validating the VNavBinding argument before processing the VNode further
   *
   * @see {@link https://vuejs.org/guide/reusability/custom-directives#directive-hooks Directive Hooks}
   */
  created: DirectiveHook<any, null, VNavBinding> | undefined = (el, binding) =>
    validateVNavBinding(binding.value)

  /**
   * Called after a vnode and all of its parent/children are updated
   *
   * Handles re-applying scaffolding to each element after they are re-rendered
   *
   * @see {@link https://vuejs.org/guide/reusability/custom-directives#directive-hooks Directive Hooks}
   */
  updated:
    | DirectiveHook<any, VNode<any, any, { [key: string]: any }>, VNavBinding>
    | undefined = (el, binding, vnode) => {
    validateVNavBinding(binding.value)

    this._scaffoldVNode(vnode)
  }

  /**
   * Called when a component mounts that is using the {@linkcode VNav} directive
   *
   * Handles wrapping the {@linkcode VNode} in a usable {@linkcode VNavElement} and adding it to the {@linkcode VNavDirective._nodeMap Map}
   *
   * @see {@link https://vuejs.org/guide/reusability/custom-directives#directive-hooks Directive Hooks}
   */
  mounted: DirectiveHook<any, null, VNavBinding> | undefined = (
    el,
    binding,
    vnode
  ) => {
    validateVNavBinding(binding.value)

    let group = `${binding.arg || "unknown"}`
    if (binding.value.subgroup) group += `-${binding.value.subgroup}`

    const vnavElement = this._createVNavElement(vnode, binding.value)

    this._nodeMap.put(group, vnavElement)
    this._scaffoldVNode(vnode)
  }

  /**
   * Called when a component unmounts that is using the {@linkcode VNav} directive
   *
   * Handles removing the {@linkcode VNode}'s {@linkcode VNavElement} wrapper from the {@linkcode VNavDirective._nodeMap Map}
   *
   * @see {@link https://vuejs.org/guide/reusability/custom-directives#directive-hooks Directive Hooks}
   */
  unmounted: DirectiveHook<any, null, VNavBinding> | undefined = (
    el,
    binding,
    vnode
  ) => {
    validateVNavBinding(binding.value)

    let group = `${binding.arg || "unknown"}`
    if (binding.value.subgroup) group += `-${binding.value.subgroup}`

    this._nodeMap.remove(vnode, group)
    this._unScaffoldVNode(vnode)
  }

  //#endregion
}

//#endregion

//#region State Management

/**
 * Wrapper for `Map<T, VNavElement[]>`
 * Contains convenience methods for interacting with the underlying {@linkcode Map}
 */
class VNavElementMap<T> {
  /**
   * @prop
   * Underlying {@linkcode Map} being wrapped
   */
  private _map: Map<T, VNavElement[]>

  constructor() {
    this._map = new Map()
  }

  //#region Private Methods

  /**
   * Removes a {@linkcode VNavElement} from the {@linkcode VNavElementMap._map Map}
   * @param group Group the node belongs to
   * @param key Key of the node
   */
  private _removeVNode(group: T, key: string) {
    const nodes: VNavElement[] | undefined = this._map.get(group)

    if (nodes == null) {
      throw new Error("VNode group not found: " + group)
    }

    const i: number = nodes.findIndex((el: VNavElement) => el.key === key)

    if (i === -1) {
      throw new Error(
        "Vnode group " + group + " did not contain vnode with key " + key
      )
    }

    nodes.splice(i, 1)
  }

  /**
   * Compares two {@linkcode VNavElement VNavElements} by their {@linkcode VNavElement.i i} field in Ascending order
   * @param a Element a
   * @param b Element b
   * @returns -1, 0, or 1
   */
  private _compareVNavElementByIndex(a: VNavElement, b: VNavElement) {
    const aI = a.i
    const bI = b.i

    // Sort by name when I(ndex) is matching
    if (aI === bI) return b.key.localeCompare(a.key, "en-US", { numeric: true })
    else if (aI == null) return -1
    else if (bI == null) return 1
    else return aI - bI
  }

  //#endregion

  //#region Public Methods

  /**
   * Gets vnode for the element, or null if not found
   * @param el Element whose vnode to find
   * @returns Corresponding VNode or null
   */
  getVNode(el: HTMLElement) {
    for (const [, value] of this._map.entries()) {
      const vnavEl = value.find((x: VNavElement) => x.node.el === el)

      if (vnavEl != null) return vnavEl.node
    }

    return null
  }

  /**
   * Gets the group of a {@linkcode VNode}
   * @param node VNode to search for
   * @returns Group that contains the VNode, or null if not found
   */
  getGroup(node: VNode): T | null {
    for (const key of this._map.keys()) {
      if (
        this._map.get(key as T)?.some((el: VNavElement) => el.node === node)
      ) {
        return key as T
      }
    }

    return null
  }

  /**
   * Gets the value of the group in the {@linkcode VNavElementMap._map Map}
   * @param group Group to retrieve
   * @returns Array of {@linkcode VNavElement} belonging to the group, or **null** if not found
   */
  get(group: T): VNavElement[] | null {
    return (
      this._map.get(group)?.toSorted(this._compareVNavElementByIndex) || null
    )
  }

  /**
   * Attemps to store a {@linkcode VNavElement} in the specified group in the {@linkcode VNavElementMap._map Map}
   * @param group Group to store the element in
   * @param navEl Element to insert
   */
  put(group: T, navEl: VNavElement): void {
    if (!this._map.has(group)) {
      this._map.set(group, [navEl])
    } else {
      const groupVal: VNavElement[] = this._map.get(group) as VNavElement[]

      if (groupVal.some((x: VNavElement) => x.key === navEl.key)) {
        console.warn(
          "Duplicate key found in v-nav group '" + group + "' -- " + navEl.key
        )
      }

      groupVal.push(navEl)
    }
  }

  /**
   * Attempts to remove the item ({@linkcode VNode}|{@linkcode VNavElement.key key}) from the {@linkcode VNavElementMap._map Map}
   * @param x VNode or key to remove from the group
   * @param group Specific group to remove **x** from
   */
  remove(x: VNode | string, group?: T) {
    let nodeKey: string

    if (typeof x === "string") {
      nodeKey = x
    } else {
      const binding = getVNavBinding(x)

      if (binding == null) {
        console.warn("VNav binding not found for vnode")
        return
      }

      nodeKey = binding.key
    }

    if (group) {
      this._removeVNode(group, nodeKey)
    } else {
      // Iterate over all entries in the map
      const removeNode = Array.from(this._map.entries())
        // Find the entry where one of the nodes has the nodeKey
        .find(([, nodes]) =>
          nodes.some((el: VNavElement) => el.key === nodeKey)
        )

      if (removeNode) {
        const [removeKey, _nodes] = removeNode || []

        this._removeVNode(removeKey, nodeKey)
      }
    }
  }

  //#endregion
}
//#endregion

function getKeyFromEvent(e: KeyboardEvent): Key {
  const { code, shiftKey, altKey, ctrlKey } = e

  return {
    code,
    shiftKey,
    altKey,
    ctrlKey
  }
}

// From a list of actions, get the one that matches the key(s) pressed
// Higher score for more matching properties. However, if one property is explicitly mismatched (i.e. not undefined), it won't even be considered as a match.
function getActionForKey(
  actions: Map<Key, Action>,
  key: Key
): Action | undefined {
  return [...actions.entries()]
    .reduce((matches, [k, a]) => {
      if (k.code === key.code) {
        let score = 0
        if (k.ctrlKey != null) {
          if (k.ctrlKey !== key.ctrlKey) {
            return [...matches]
          }

          score++
        }

        if (k.altKey != null) {
          if (k.altKey !== key.altKey) {
            return [...matches]
          }

          score++
        }

        if (k.shiftKey != null) {
          if (k.shiftKey !== key.shiftKey) {
            return [...matches]
          }

          score++
        }

        return [...matches, { action: a, score }]
      }

      return [...matches]
    }, [] as { action: Action; score: number }[])
    .sort(({ score: a }, { score: b }) => b - a)[0]?.action
}

/**
 * @example
 * ```ts
 * app.use(VNav)
 * ```
 * @example
 * ```ts
 * import { Action } from "vnav"
 * app.use(VNav, {
 *  actions: [
 *    new Action({
 *      id: "movedown",
 *      code: "ArrowDown",
 *      description: "Navigate down"
 *      cb: (e, vnav) => vnav.moveNext()
 *    })
 *  ]
 * } as VNavOptions)
 * ```
 */
export default {
  install: (app: App<Element>, opts: VNavOptions) => {
    const actions = new Map<Key, Action>()

    if (!opts.removeDefaultActions) {
      // Defaults first
      defaults.actions.forEach((a) => a.keys.forEach((k) => actions.set(k, a)))
    }

    // Add consumer-defined actions (not originating from the plugin itself)
    opts.actions.forEach((a) => {
      a.keys.forEach((k) => {
        if (
          [...actions].filter(([existingKey, _existingAction]) => {
            return (
              existingKey.code === k.code &&
              existingKey.altKey === k.altKey &&
              existingKey.shiftKey === k.shiftKey &&
              existingKey.ctrlKey === k.ctrlKey
            )
          }).length
        ) {
          console.warn("Duplicate key found. Action: " + a.id)
        }
        actions.set(k, a)
      })
    })

    const vnav = new VNavDirective(actions)

    app.directive("nav", vnav)

    document.addEventListener("keydown", (e) => {
      vnav.handleKeyboardEvent(e)
    })
    window.addEventListener("focusin", (e) => {
      vnav.handleFocusEvent(e)
    })
  }
}
