import {
  App,
  DirectiveBinding,
  DirectiveHook,
  ObjectDirective,
  VNode
} from "vue"
import "./vnav.scss"

/**
 * Default keybinds that are automatically put on every {@linkcode VNavElement} unless overridden in the {@linkcode VNavOptions} or {@linkcode VNavBinding}
 */
const defaults = {
  keybinds: [
    {
      keycode: "ArrowUp",
      callback(e, vnav) {
        vnav.movePrevious()
      }
    },
    {
      keycode: "ArrowDown",
      callback(e, vnav) {
        vnav.moveNext()
      }
    }
  ] as VNavKeyBind[]
}

/**
 * Checks a VNode for the VNav directive, and returns it's **binding.value** if found.
 * @param node {@linkcode VNode} to check for the {@linkcode VNav} directive
 * @returns The node's {@linkcode VNavBinding} or **null** if the directive is not attached to it
 */
function getVNavBinding(node: VNode): VNavBinding | null {
  const dirs: DirectiveBinding[] = node.dirs || []

  const vnav = dirs.find((x) => x.dir instanceof VNav)

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
 *
 * @param value Manually checks a value to confirm it is a VNavKeyBind
 * @returns Whether the value is a VNavKeyBind
 */
function isVNavKeyBind(value: VNavKeyBind): value is VNavKeyBind {
  if (!value.callback || typeof value.callback !== "function") {
    return false
  }

  if (!value.keycode || typeof value.keycode !== "string") {
    return false
  }

  if (value.defaultBehavior && typeof value.defaultBehavior !== "boolean") {
    return false
  }

  return true
}

/**
 * Manually checks a value to confirm it is a VNavBinding
 * @param value Supposed VNavBinding
 * @returns Whether the value is a VNavBinding
 */
function isVNavBinding(value: VNavBinding): value is VNavBinding {
  if (!value.key || typeof value.key !== "string") {
    return false
  }

  if (value.insertAfter && typeof value.insertAfter !== "string") {
    return false
  }

  if (value.subgroup && typeof value.subgroup !== "string") {
    return false
  }

  if (value.keybinds && value.keybinds instanceof Array) {
    if (!value.keybinds.every(isVNavKeyBind)) {
      return false
    }
  }

  return true
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
class VNav implements ObjectDirective<any, VNavBinding> {
  /**
   * Currently mounted {@linkcode VNavElement VNavElements} separated by groups
   *
   * @see {@linkcode VNavElementMap}
   */
  private _nodeMap: VNavElementMap<string>

  /**
   * @prop
   * Points at the currently focused element if it exists in the {@linkcode VNav._nodeMap Map}
   */
  private _pointer: VNavPointer

  /**
   * @prop
   * Default keybinds to apply to new {@linkcode VNavElement VNavElements}
   */
  private _defaultKeybinds: Map<string, VNavKeyBind>

  constructor(defaultKeybinds?: Map<string, VNavKeyBind>) {
    this._nodeMap = new VNavElementMap<string>()
    this._pointer = {
      group: null,
      i: -1
    }
    this._defaultKeybinds = defaultKeybinds || new Map<string, VNavKeyBind>()
  }

  //#region Getters

  /**
   * @prop
   * Current {@linkcode VNavElement} based on the {@linkcode VNav._pointer pointer}
   */
  private get _current(): VNavElement | null {
    const { group, i } = this._pointer

    if (group == null || i === -1) {
      return null
    }

    return this._nodeMap.get(group)?.at(i) || null
  }

  /**
   * @prop
   * Current group based on the {@linkcode VNav._pointer pointer}
   */
  public get group(): string | null {
    return this._pointer.group
  }

  /**
   * @prop
   * Current index based on the {@linkcode VNav._pointer pointer}
   */
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

  private _assignIndex(insertAfter: string | null, group: string) {
    if (insertAfter == null) return -1

    return (
      this._nodeMap.get(group)?.findIndex((kb) => kb.key === insertAfter) || -1
    )
  }

  //#endregion

  //#region Public Methods

  /**
   * Looks up the node in the {@linkcode VNav._nodeMap Map} and returns its group
   * @returns Group of the node or null if not found
   */
  getGroup(node: VNode): string | null {
    return this._nodeMap.getGroup(node)
  }

  /**
   * Looks up the node in the {@linkcode VNav._nodeMap Map} and returns its index
   * @param node {@linkcode VNode} to search for
   * @param group Group to search in. If null, will search every group
   * @returns Index of the node, or -1 if not found
   */
  indexOf(node: VNode, group?: string | null): number {
    group = group || this._nodeMap.getGroup(node)

    if (group == null) {
      return -1
    }

    const nodes = this._nodeMap.get(group) || []

    return nodes.findIndex((el: VNavElement) => el.node === node)
  }

  /**
   * Decrements the {@linkcode VNav._pointer pointer}'s index
   * @param amount How much to decrement the pointer
   */
  movePrevious(amount?: number) {
    const { group, i } = this._pointer

    if (group == null || i === -1) {
      return
    }

    const decrement = amount != null ? amount : 1
    this.focus(group, i - decrement)
  }

  /**
   * Increments the {@linkcode VNav._pointer pointer}'s index
   * @param amount How much to increment the pointer
   */
  moveNext(amount?: number) {
    const { group, i } = this._pointer

    if (group == null || i === -1) {
      return
    }

    const increment = amount != null ? amount : 1
    this.focus(group, i + increment)
  }

  /**
   * Unfocuses the currently pointed at element if it exists
   */
  unfocus() {
    this._pointer = {
      group: null,
      i: -1
    }
  }

  /**
   * Updates the pointer and focuses the newly pointed at {@linkcode VNavElement}
   * @param group Group of the element
   * @param i Index of the element
   */
  focus(group: string, i: number) {
    const nodes = this._nodeMap.get(group)

    if (nodes == null) return

    i = ensureIndexInBounds(i, nodes.length)

    const el = nodes[i]?.node?.el

    if (el != null) {
      this.unfocus()
      el.focus()
      this._pointer.group = group
      this._pointer.i = i
    }
  }
  //#endregion

  //#region Event Handlers

  /**
   * Passes the KeyboardEvent to the currently focused {@linkcode VNavElement} if a keybind is registered on it
   * @param e {@linkcode KeyboardEvent} that was called
   */
  handleKeyboardEvent(e: KeyboardEvent) {
    if (this._current == null) return

    const bind = this._current.keybinds.get(e.code)

    if (bind == null) return

    // Logic
    if (!bind.defaultBehavior) {
      e.preventDefault()
    }

    // Gives access to the event AND vnav object
    bind.callback(e, this)
  }

  /**
   * Handles updating the {@linkcode VNav._pointer pointer} dynamically when different elements are focused/unfocuses in the window.
   *
   * Allows
   * {@linkcode VNavElement VNavElements} to be focused/unfocused without explicit rules on navigation to/from them
   * &
   * {@linkcode VNav} work with normal focus methods, such as clicking an element and using tab/shift+tab
   *
   * @param e {@linkcode FocusEvent} that was called
   */
  handleFocusEvent(e: FocusEvent) {
    const vnode: VNode | null = e.target?.["__vnode"]

    if (vnode == null || vnode === this._current?.node) return

    const group = this.getGroup(vnode)

    if (group == null) {
      this.unfocus()
      return
    }

    const index = this.indexOf(vnode, group)
    if (index !== -1) {
      this.focus(group, index)
    } else {
      this.unfocus()
    }
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
   * Handles wrapping the {@linkcode VNode} in a usable {@linkcode VNavElement} and adding it to the {@linkcode VNav._nodeMap Map}
   *
   * @see {@link https://vuejs.org/guide/reusability/custom-directives#directive-hooks Directive Hooks}
   */
  mounted: DirectiveHook<any, null, VNavBinding> | undefined = (
    el,
    binding,
    vnode
  ) => {
    validateVNavBinding(binding.value)

    const group =
      `${binding.arg || "unknown"}` + (binding.value?.subgroup || "")

    const vnavElement: VNavElement = {
      key: binding.value.key,
      node: vnode,
      keybinds: new Map<string, VNavKeyBind>(this._defaultKeybinds) // Clone defaults
    }

    // Defaults can be overridden here on a per-element basis
    binding.value.keybinds?.forEach((bind) => {
      vnavElement.keybinds.set(bind.keycode, {
        ...bind,
        defaultBehavior: bind.defaultBehavior || false
      } as VNavKeyBind)
    })

    const insertAfter = binding.value?.insertAfter || null

    const i = this._assignIndex(insertAfter, group)

    this._nodeMap.put(group, vnavElement, i)
    this._scaffoldVNode(vnode)
  }

  /**
   * Called when a component unmounts that is using the {@linkcode VNav} directive
   *
   * Handles removing the {@linkcode VNode}'s {@linkcode VNavElement} wrapper from the {@linkcode VNav._nodeMap Map}
   *
   * @see {@link https://vuejs.org/guide/reusability/custom-directives#directive-hooks Directive Hooks}
   */
  unmounted: DirectiveHook<any, null, VNavBinding> | undefined = (
    el,
    binding,
    vnode
  ) => {
    validateVNavBinding(binding.value)

    const group =
      `${binding.arg || "unknown"}` + (binding.value?.subgroup || "")
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
  //#endregion

  //#region Public Methods

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
    return this._map.get(group) || null
  }

  /**
   * Attemps to store a {@linkcode VNavElement} in the specified group in the {@linkcode VNavElementMap._map Map}
   * @param group Group to store the element in
   * @param navEl Element to insert
   * @param i Index to insert the element at
   */
  put(group: T, navEl: VNavElement, i?: number): void {
    if (!this._map.has(group)) {
      this._map.set(group, [navEl])
    } else {
      const groupVal: VNavElement[] = this._map.get(group) as VNavElement[]

      if (groupVal.some((x: VNavElement) => x.key === navEl.key)) {
        console.warn(
          "Duplicate key found in v-nav group '" + group + "' -- " + navEl.key
        )
      }

      if (i != null && i > -1 && i < groupVal.length) {
        // Do a splice then insert
        groupVal.push(...[navEl, ...groupVal.splice(i + 1)])
      } else {
        groupVal.push(navEl)
      }
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
        // Find the entry were one of the nodes has the nodeKey
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

/**
 * @example
 * ```ts
 * app.use(VNav)
 * ```
 * @example
 * ```ts
 * app.use(VNav, {
 *  keybinds: [
 *    {
 *      keycode: "ArrowDown",
 *      callback: (e, vnav) => {
 *        vnav.moveNext()
 *      }
 *    }
 *  ]
 * } as VNavOptions)
 * ```
 */
export default {
  install: (app: App<Element>, options: VNavOptions) => {
    const defaultKeybinds = new Map<string, VNavKeyBind>()

    // Defaults first
    defaults.keybinds.forEach((kb) => defaultKeybinds.set(kb.keycode, kb))
    // Allow options to override
    options?.keybinds.forEach((kb) => defaultKeybinds.set(kb.keycode, kb))

    const vnav: VNav = new VNav(defaultKeybinds)

    app.directive("nav", vnav)

    document.addEventListener("keydown", (e) => {
      vnav.handleKeyboardEvent(e)
    })
    window.addEventListener("focusin", (e) => {
      vnav.handleFocusEvent(e)
    })
  }
}

//#region Types

/**
 * Pointer used in {@linkcode VNav} to keep track of the focused {@linkcode VNode}'s group and index
 * @see {@linkcode VNav._pointer usage}
 */
export interface VNavPointer {
  /**
   * Key in the VNav's {@linkcode VNav._nodeMap Map }
   * **null** if none in focus
   */
  group: string | null

  /**
   * Index of the current focused {@linkcode VNavElement} in the VNav's {@linkcode VNav._nodeMap Map}
   * **-1** if none in focus
   */
  i: number
}

/**
 * Options used when installing the {@linkcode VNav} plugin
 * @example
 * ```ts
 * app.use(VNav, {
 *  keybinds: [
 *    {
 *      keycode: "ArrowDown",
 *      callback: (e, vnav) => {
 *        vnav.moveNext()
 *      }
 *    }
 *  ]
 * } as VNavOptions)
 * ```
 */
export interface VNavOptions {
  /**
   * @prop
   * Default keybinds applied to every {@linkcode VNavElement} unless overridden in the directive **binding.value**
   */
  keybinds: VNavKeyBind[]
}

/**
 * Wrapper for VNode that contains extra data needed for VNav functionality
 * @see {@linkcode VNav.mounted}
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
   * {@linkcode Map} of {@linkcode VNavKeyBind} that wil be searched by keycode when the element is focused during a {@linkcode KeyboardEvent}
   */
  keybinds: Map<string, VNavKeyBind>
}

/**
 * Defines a Keybind for use with the {@linkcode VNav} directive
 * @see {@linkcode VNav.handleKeyboardEvent usage}
 */
export interface VNavKeyBind {
  /**
   * @prop
   * **KeyboardEvent.code** for key pressed during {@linkcode KeyboardEvent}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code Codes}
   */
  keycode: string

  /**
   * @prop
   * Whether the keybind should allow the {@linkcode KeyboardEvent}'s default behavior
   */
  defaultBehavior?: boolean

  /**
   * Function called when keybind is activated
   * @param e {@linkcode KeyboardEvent} instance
   * @param vnav {@linkcode VNav} instance
   */
  callback: (e: KeyboardEvent, vnav: VNav) => void
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
   * {@linkcode VNavBinding.key Key} after which the {@linkcode VNav} stores the element. If undefined, the {@linkcode VNavElement} is pushed to the end of the group.
   */
  insertAfter?: string

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
}

//#endregion
