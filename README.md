# VNav Documentation
VNav is a Vue plugin that was created to make any HTML element navigable via keyboard.  
It was originally designed to be able to move across a list of elements using arrow keys, and activate a single callback on the focused element.

Now, it is a framework designed to enable the use of limitless callback functionality and uses key-mapping to activate those callbacks.

## How to use
To get started using the plugin, you must first install it to the app.  
Before the app mounts, you must call `app.use(VNav, opts)`
  
The options can be validated by casting VNavOptions to a variable in typescript, or by viewing the source "install" method, where the type is created.  

Then, in your vue template, simply add the v-nav directive to an element/component. 
It requires a binding value and optional arg.

### Arg
The arg is used to define which group of elements that it will belong to. This is useful for separating groups of elements and preventing jumping behavior across the site.  

>-This is set by putting a colon between v-nav and the group-name. 

Example 1: `<div v-nav:group1 />`
<small>This div now belongs to group1</small>

Example 2: `<div v-nav />`
<small>This div now belongs to the global unknown group</small>

### Binding   
One final piece of information is required to enable keyboard controls on an element... the binding!  
**YOU  CANNOT USE `v-nav` WITHOUT A BINDING**

A binding is the value passed to the directive, which contains crucial information.  
For v-nav, that information can expand or limit functionality and is required to function.

**key** - Unique string (per-group) used to identify the component v-nav is on
**i?** - Order in which the component should be navigable. **If undefined, it will sort by key**
**subgroup?** - sub-group since you cannot put dashes in Vue Directive args
**onFocus?** - Callback that is executed just before the element becomes focused through any method (clicking, calling .focus(), etc.)
**nextGroup?** - Next group to overflow into if the new index from `vnav#moveNext` is out of the current group's length - 1
**previousGroup?** - Next group to overflow into if the new index from `vnav#moveNext` is below 0
**keybinds?** - List of keybinds in the following format:
```ts
{
	// Id of the action, as defined on installation of the plugin
	action: string,
	// Can accept the KeyboardEvent and VNav instance as arguments
	// If undefined, vnav will use the default cb associated with the action (as defined on installation of the plugin)
	// If present, it will take priority over the existing action's callback, but is activated by the same keys
	cb?: AnyFunction
}
```
#### Keybinds (Actions)
Actions are how `v-nav` determines what to do when keys are pressed on an element. 

An action is comprised of a few key things.
**id** - Unique identifier used in the vnav bindings to register an action to the element.
**cb** (Callback)  - Optional default callback that occurs when the key combination is pressed.
**keys** - Instance of Key[] that is referenced when keydown event happens on an element with v-nav. When a keypress happens, v-nav will find the Key instance with the closest matching combination of keys based on each action registered to the element.

Example:
```ts
moveDownAction: Action = new Action({
	id: "movedown"
	name: "Move Down",
	description: "Increments the points ay 1, moving down a vertical list.",
	cb: (e, vnav) => vnav.movePrevious(e.shift ? 10 : 1),
	// Action will activate by ArrowDown key and not check any other conditions
	// OR by S key and also requires shift to be pressed
	// OR by K key and also required shift NOT pressed, ctrl pressed
	keys: ["ArrowDown", {
		code: "S",
		shift: true
	  },
	  {
	    code: "K",
	    shift: false,
	    ctrl: true
	  }
	]
})
```

As you can in the above example, there are a few different ways to define a key trigger on an action.
The code is the keycode for a key, and then you can also define whether or not to require shift, ctrl, and/or alt.
If shift, ctrl, or alt are undefined, they will not be checked and will only check the keycode. If false, it will check 
False - not pressed
True - pressed
undefined - Don't check

v-nav uses these Key objects to determine which action was activated on the element. If the element has no actions, nothing will happen. However, if it does, v-nav will find the closest matching keybind from the list of actions. 

Example:
```ts
const keys: Key[] = [
	{
		code: "ArrowDown",
		shift: true
	},
	{
		code: "ArrowDown"
		shift: false
	}
]
```
In the above example, if the user hit shift and ArrowDown, the first Key would be detected.
If they just hit ArrowDown, the second one would be detected.
Otherwise, v-nav will choose the first key in the list with an equal matching number.
 - Prioritizes matching properties, like shift: true/false over undefined properties. 

#### Default Actions
By default, there are two actions available:
`moveup` - Decrements the pointer by 1 (10 with shift) . Activated by ArrowUp
`movedown` - Increments the pointer by 1 (10 with shift). Activated by ArrowDown



## Behind-the-scenes

Now that you have a basic understanding of how to implement v-nav in a Vue application, you may be curious how everything is handled by the plugin.  

### State
When VNav is installed to an unmounted app, it creates a singleton instance of the VNavDirective. The directive keeps track of which components are active on the screen by keeping an in-memory store of each component's binding value and a copy of the most recent VNode associated with it.

A VNode is just a point-in-time wrapper for a component. The data changes any time the element or its attributes change, but they are NOT reference variables so its not as simple as just storing them on mount or creation.

VNav creates an entry when the component is mounted, updates its entry any time the component is updated, and removes all of its data when the component is unmounted. 

*Certain optimizations are made to reduce the load on the client's browser, such as transforming key --> action data-structure into a map*

> Data stored includes the VNode, binding, and arg of each component/element

### Events

After the singleton is created, two event listeners are added to the document.
#### focusin
Dynamically updates the singleton's pointer by cross-referencing the element focused with all mounted VNodes using v-nav.

> *vnav#handleFocusEvent*

#### keydown
Handles the event --> key --> action --> callback lifecycle. 

If all these conditions are true, the keybind is run successfully:
1. Check if a VNavElement is currently focused in the document by referencing its pointer
2. Check if that element has any keybinds registered to it
3. Check if any actions are triggered by the keys pressed in the event
4. Call keybind's cb if present, or the action's cb which will throw an error if not present.

> *vnav#handleKeyboardEvent*
