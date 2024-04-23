var y = Object.defineProperty;
var _ = (o, n, e) => n in o ? y(o, n, { enumerable: !0, configurable: !0, writable: !0, value: e }) : o[n] = e;
var u = (o, n, e) => (_(o, typeof n != "symbol" ? n + "" : n, e), e);
const v = {
  keybinds: [
    {
      keycode: "ArrowUp",
      // @ts-expect-error
      callback(o, n) {
        n.movePrevious();
      }
    },
    {
      keycode: "ArrowDown",
      // @ts-expect-error
      callback(o, n) {
        n.moveNext();
      }
    }
  ]
};
function g(o) {
  const e = (o.dirs || []).find((t) => t.dir instanceof h);
  return e == null ? null : e.value;
}
function k(o, n) {
  return Math.min(n - 1, Math.max(0, o));
}
function m(o) {
  return !(o == null || !o.callback || typeof o.callback != "function" || !o.keycode || typeof o.keycode != "string" || o.defaultBehavior && typeof o.defaultBehavior != "boolean");
}
function w(o) {
  return !(o == null || !o.key || typeof o.key != "string" || o.insertAfter && typeof o.insertAfter != "string" || o.subgroup && typeof o.subgroup != "string" || o.keybinds && o.keybinds instanceof Array && !o.keybinds.every(m));
}
function l(o) {
  if (!w(o))
    throw new TypeError("value could not be parsed as VNavBinding");
}
class h {
  constructor(n) {
    /**
     * Currently mounted {@linkcode VNavElement VNavElements} separated by groups
     *
     * @see {@linkcode VNavElementMap}
     */
    u(this, "_nodeMap");
    /**
     * @prop
     * Points at the currently focused element if it exists in the {@linkcode VNav._nodeMap Map}
     */
    u(this, "_pointer");
    /**
     * @prop
     * Default keybinds to apply to new {@linkcode VNavElement VNavElements}
     */
    u(this, "_defaultKeybinds");
    //#endregion
    //#region Hooks
    /**
     * Called when the VNode is created
     *
     * Handles validating the VNavBinding argument before processing the VNode further
     *
     * @see {@link https://vuejs.org/guide/reusability/custom-directives#directive-hooks Directive Hooks}
     */
    // @ts-expect-error
    u(this, "created", (n, e) => l(e.value));
    /**
     * Called after a vnode and all of its parent/children are updated
     *
     * Handles re-applying scaffolding to each element after they are re-rendered
     *
     * @see {@link https://vuejs.org/guide/reusability/custom-directives#directive-hooks Directive Hooks}
     */
    u(this, "updated", (n, e, t) => {
      l(e.value), this._scaffoldVNode(t);
    });
    /**
     * Called when a component mounts that is using the {@linkcode VNav} directive
     *
     * Handles wrapping the {@linkcode VNode} in a usable {@linkcode VNavElement} and adding it to the {@linkcode VNav._nodeMap Map}
     *
     * @see {@link https://vuejs.org/guide/reusability/custom-directives#directive-hooks Directive Hooks}
     */
    u(this, "mounted", (n, e, t) => {
      var a, f, c;
      l(e.value);
      const s = `${e.arg || "unknown"}` + (((a = e.value) == null ? void 0 : a.subgroup) || ""), r = {
        key: e.value.key,
        node: t,
        keybinds: new Map(this._defaultKeybinds)
        // Clone defaults
      };
      (f = e.value.keybinds) == null || f.forEach((d) => {
        r.keybinds.set(d.keycode, {
          ...d,
          defaultBehavior: d.defaultBehavior || !1
        });
      });
      const i = ((c = e.value) == null ? void 0 : c.insertAfter) || null, p = this._assignIndex(i, s);
      this._nodeMap.put(s, r, p), this._scaffoldVNode(t);
    });
    /**
     * Called when a component unmounts that is using the {@linkcode VNav} directive
     *
     * Handles removing the {@linkcode VNode}'s {@linkcode VNavElement} wrapper from the {@linkcode VNav._nodeMap Map}
     *
     * @see {@link https://vuejs.org/guide/reusability/custom-directives#directive-hooks Directive Hooks}
     */
    u(this, "unmounted", (n, e, t) => {
      var r;
      l(e.value);
      const s = `${e.arg || "unknown"}` + (((r = e.value) == null ? void 0 : r.subgroup) || "");
      this._nodeMap.remove(t, s), this._unScaffoldVNode(t);
    });
    this._nodeMap = new b(), this._pointer = {
      group: null,
      i: -1
    }, this._defaultKeybinds = n || /* @__PURE__ */ new Map();
  }
  //#region Getters
  /**
   * @prop
   * Current {@linkcode VNavElement} based on the {@linkcode VNav._pointer pointer}
   */
  get _current() {
    var t;
    const { group: n, i: e } = this._pointer;
    return n == null || e === -1 ? null : ((t = this._nodeMap.get(n)) == null ? void 0 : t[e]) || null;
  }
  /**
   * @prop
   * Current group based on the {@linkcode VNav._pointer pointer}
   */
  get group() {
    return this._pointer.group;
  }
  /**
   * @prop
   * Current index based on the {@linkcode VNav._pointer pointer}
   */
  get index() {
    return this._pointer.i;
  }
  //#endregion
  //#region Private Methods
  /**
   * Adds necessary scaffolding/structure to a VNode to work with VNav
   * @param node {@linkcode VNode} to scaffold
   */
  _scaffoldVNode(n) {
    const e = n.el;
    e != null && (e.classList.contains("vnav-element") || e.classList.add("vnav-element"), e.tabIndex = 0);
  }
  /**
   * Strips a VNode of all existing VNav scaffolding
   * @param node {@linkcode VNode} to un-scaffold
   */
  _unScaffoldVNode(n) {
    const e = n.el;
    e != null && e.classList.remove("vnav-element");
  }
  _assignIndex(n, e) {
    var t;
    return n == null ? -1 : ((t = this._nodeMap.get(e)) == null ? void 0 : t.findIndex((s) => s.key === n)) || -1;
  }
  //#endregion
  //#region Public Methods
  /**
   * Looks up the node in the {@linkcode VNav._nodeMap Map} and returns its group
   * @returns Group of the node or null if not found
   */
  getGroup(n) {
    return this._nodeMap.getGroup(n);
  }
  /**
   * Looks up the node in the {@linkcode VNav._nodeMap Map} and returns its index
   * @param node {@linkcode VNode} to search for
   * @param group Group to search in. If null, will search every group
   * @returns Index of the node, or -1 if not found
   */
  indexOf(n, e) {
    return e = e || this._nodeMap.getGroup(n), e == null ? -1 : (this._nodeMap.get(e) || []).findIndex((s) => s.node === n);
  }
  /**
   * Decrements the {@linkcode VNav._pointer pointer}'s index
   * @param amount How much to decrement the pointer
   */
  movePrevious(n) {
    const { group: e, i: t } = this._pointer;
    if (e == null || t === -1)
      return;
    const s = n ?? 1;
    this.focus(e, t - s);
  }
  /**
   * Increments the {@linkcode VNav._pointer pointer}'s index
   * @param amount How much to increment the pointer
   */
  moveNext(n) {
    const { group: e, i: t } = this._pointer;
    if (e == null || t === -1)
      return;
    const s = n ?? 1;
    this.focus(e, t + s);
  }
  /**
   * Unfocuses the currently pointed at element if it exists
   */
  unfocus() {
    this._pointer = {
      group: null,
      i: -1
    };
  }
  /**
   * Updates the pointer and focuses the newly pointed at {@linkcode VNavElement}
   * @param group Group of the element
   * @param i Index of the element
   */
  focus(n, e) {
    var r, i;
    const t = this._nodeMap.get(n);
    if (t == null)
      return;
    e = k(e, t.length);
    const s = (i = (r = t[e]) == null ? void 0 : r.node) == null ? void 0 : i.el;
    s != null && (this.unfocus(), s.focus(), this._pointer.group = n, this._pointer.i = e);
  }
  //#endregion
  //#region Event Handlers
  /**
   * Passes the KeyboardEvent to the currently focused {@linkcode VNavElement} if a keybind is registered on it
   * @param e {@linkcode KeyboardEvent} that was called
   */
  handleKeyboardEvent(n) {
    if (this._current == null)
      return;
    const e = this._current.keybinds.get(n.code);
    e != null && (e.defaultBehavior || n.preventDefault(), e.callback(n, this));
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
  handleFocusEvent(n) {
    var r, i;
    const e = (r = n.target) == null ? void 0 : r.__vnode;
    if (e == null || e === ((i = this._current) == null ? void 0 : i.node))
      return;
    const t = this.getGroup(e);
    if (t == null) {
      this.unfocus();
      return;
    }
    const s = this.indexOf(e, t);
    s !== -1 ? this.focus(t, s) : this.unfocus();
  }
  //#endregion
}
class b {
  constructor() {
    /**
     * @prop
     * Underlying {@linkcode Map} being wrapped
     */
    u(this, "_map");
    this._map = /* @__PURE__ */ new Map();
  }
  //#region Private Methods
  /**
   * Removes a {@linkcode VNavElement} from the {@linkcode VNavElementMap._map Map}
   * @param group Group the node belongs to
   * @param key Key of the node
   */
  _removeVNode(n, e) {
    const t = this._map.get(n);
    if (t == null)
      throw new Error("VNode group not found: " + n);
    const s = t.findIndex((r) => r.key === e);
    if (s === -1)
      throw new Error(
        "Vnode group " + n + " did not contain vnode with key " + e
      );
    t.splice(s, 1);
  }
  //#endregion
  //#region Public Methods
  /**
   * Gets the group of a {@linkcode VNode}
   * @param node VNode to search for
   * @returns Group that contains the VNode, or null if not found
   */
  getGroup(n) {
    var e;
    for (const t of this._map.keys())
      if ((e = this._map.get(t)) != null && e.some((s) => s.node === n))
        return t;
    return null;
  }
  /**
   * Gets the value of the group in the {@linkcode VNavElementMap._map Map}
   * @param group Group to retrieve
   * @returns Array of {@linkcode VNavElement} belonging to the group, or **null** if not found
   */
  get(n) {
    return this._map.get(n) || null;
  }
  /**
   * Attemps to store a {@linkcode VNavElement} in the specified group in the {@linkcode VNavElementMap._map Map}
   * @param group Group to store the element in
   * @param navEl Element to insert
   * @param i Index to insert the element at
   */
  put(n, e, t) {
    if (!this._map.has(n))
      this._map.set(n, [e]);
    else {
      const s = this._map.get(n);
      s.some((r) => r.key === e.key) && console.warn(
        "Duplicate key found in v-nav group '" + n + "' -- " + e.key
      ), t != null && t > -1 && t < s.length ? s.push(e, ...s.splice(t + 1)) : s.push(e);
    }
  }
  /**
   * Attempts to remove the item ({@linkcode VNode}|{@linkcode VNavElement.key key}) from the {@linkcode VNavElementMap._map Map}
   * @param x VNode or key to remove from the group
   * @param group Specific group to remove **x** from
   */
  remove(n, e) {
    let t;
    if (typeof n == "string")
      t = n;
    else {
      const s = g(n);
      if (s == null) {
        console.warn("VNav binding not found for vnode");
        return;
      }
      t = s.key;
    }
    if (e)
      this._removeVNode(e, t);
    else {
      const s = Array.from(this._map.entries()).find(
        ([, r]) => r.some((i) => i.key === t)
      );
      if (s) {
        const [r, i] = s || [];
        this._removeVNode(r, t);
      }
    }
  }
  //#endregion
}
const V = {
  install: (o, n) => {
    const e = /* @__PURE__ */ new Map();
    v.keybinds.forEach((s) => e.set(s.keycode, s)), n == null || n.keybinds.forEach((s) => e.set(s.keycode, s));
    const t = new h(e);
    o.directive("nav", t), document.addEventListener("keydown", (s) => {
      t.handleKeyboardEvent(s);
    }), window.addEventListener("focusin", (s) => {
      t.handleFocusEvent(s);
    });
  }
};
export {
  V as default
};
