(function(u,i){typeof exports=="object"&&typeof module<"u"?module.exports=i():typeof define=="function"&&define.amd?define(i):(u=typeof globalThis<"u"?globalThis:u||self,u.VNav=i())})(this,function(){"use strict";var w=Object.defineProperty;var b=(u,i,f)=>i in u?w(u,i,{enumerable:!0,configurable:!0,writable:!0,value:f}):u[i]=f;var l=(u,i,f)=>(b(u,typeof i!="symbol"?i+"":i,f),f);const u={keybinds:[{keycode:"ArrowUp",callback(s,n){n.movePrevious()}},{keycode:"ArrowDown",callback(s,n){n.moveNext()}}]};function i(s){const e=(s.dirs||[]).find(t=>t.dir instanceof h);return e==null?null:e.value}function f(s,n){return Math.min(n-1,Math.max(0,s))}function v(s){return!(s==null||!s.callback||typeof s.callback!="function"||!s.keycode||typeof s.keycode!="string"||s.defaultBehavior&&typeof s.defaultBehavior!="boolean")}function g(s){return!(s==null||!s.key||typeof s.key!="string"||s.insertAfter&&typeof s.insertAfter!="string"||s.subgroup&&typeof s.subgroup!="string"||s.keybinds&&s.keybinds instanceof Array&&!s.keybinds.every(v))}function a(s){if(!g(s))throw new TypeError("value could not be parsed as VNavBinding")}class h{constructor(n){l(this,"_nodeMap");l(this,"_pointer");l(this,"_defaultKeybinds");l(this,"created",(n,e)=>a(e.value));l(this,"updated",(n,e,t)=>{a(e.value),this._scaffoldVNode(t)});l(this,"mounted",(n,e,t)=>{var p,y,_;a(e.value);const o=`${e.arg||"unknown"}`+(((p=e.value)==null?void 0:p.subgroup)||""),r={key:e.value.key,node:t,keybinds:new Map(this._defaultKeybinds)};(y=e.value.keybinds)==null||y.forEach(c=>{r.keybinds.set(c.keycode,{...c,defaultBehavior:c.defaultBehavior||!1})});const d=((_=e.value)==null?void 0:_.insertAfter)||null,k=this._assignIndex(d,o);this._nodeMap.put(o,r,k),this._scaffoldVNode(t)});l(this,"unmounted",(n,e,t)=>{var r;a(e.value);const o=`${e.arg||"unknown"}`+(((r=e.value)==null?void 0:r.subgroup)||"");this._nodeMap.remove(t,o),this._unScaffoldVNode(t)});this._nodeMap=new m,this._pointer={group:null,i:-1},this._defaultKeybinds=n||new Map}get _current(){var t;const{group:n,i:e}=this._pointer;return n==null||e===-1?null:((t=this._nodeMap.get(n))==null?void 0:t[e])||null}get group(){return this._pointer.group}get index(){return this._pointer.i}_scaffoldVNode(n){const e=n.el;e!=null&&(e.classList.contains("vnav-element")||e.classList.add("vnav-element"),e.tabIndex=0)}_unScaffoldVNode(n){const e=n.el;e!=null&&e.classList.remove("vnav-element")}_assignIndex(n,e){var t;return n==null?-1:((t=this._nodeMap.get(e))==null?void 0:t.findIndex(o=>o.key===n))||-1}getGroup(n){return this._nodeMap.getGroup(n)}indexOf(n,e){return e=e||this._nodeMap.getGroup(n),e==null?-1:(this._nodeMap.get(e)||[]).findIndex(o=>o.node===n)}movePrevious(n){const{group:e,i:t}=this._pointer;if(e==null||t===-1)return;const o=n??1;this.focus(e,t-o)}moveNext(n){const{group:e,i:t}=this._pointer;if(e==null||t===-1)return;const o=n??1;this.focus(e,t+o)}unfocus(){this._pointer={group:null,i:-1}}focus(n,e){var r,d;const t=this._nodeMap.get(n);if(t==null)return;e=f(e,t.length);const o=(d=(r=t[e])==null?void 0:r.node)==null?void 0:d.el;o!=null&&(this.unfocus(),o.focus(),this._pointer.group=n,this._pointer.i=e)}handleKeyboardEvent(n){if(this._current==null)return;const e=this._current.keybinds.get(n.code);e!=null&&(e.defaultBehavior||n.preventDefault(),e.callback(n,this))}handleFocusEvent(n){var r,d;const e=(r=n.target)==null?void 0:r.__vnode;if(e==null||e===((d=this._current)==null?void 0:d.node))return;const t=this.getGroup(e);if(t==null){this.unfocus();return}const o=this.indexOf(e,t);o!==-1?this.focus(t,o):this.unfocus()}}class m{constructor(){l(this,"_map");this._map=new Map}_removeVNode(n,e){const t=this._map.get(n);if(t==null)throw new Error("VNode group not found: "+n);const o=t.findIndex(r=>r.key===e);if(o===-1)throw new Error("Vnode group "+n+" did not contain vnode with key "+e);t.splice(o,1)}getGroup(n){var e;for(const t of this._map.keys())if((e=this._map.get(t))!=null&&e.some(o=>o.node===n))return t;return null}get(n){return this._map.get(n)||null}put(n,e,t){if(!this._map.has(n))this._map.set(n,[e]);else{const o=this._map.get(n);o.some(r=>r.key===e.key)&&console.warn("Duplicate key found in v-nav group '"+n+"' -- "+e.key),t!=null&&t>-1&&t<o.length?o.push(e,...o.splice(t+1)):o.push(e)}}remove(n,e){let t;if(typeof n=="string")t=n;else{const o=i(n);if(o==null){console.warn("VNav binding not found for vnode");return}t=o.key}if(e)this._removeVNode(e,t);else{const o=Array.from(this._map.entries()).find(([,r])=>r.some(d=>d.key===t));if(o){const[r,d]=o||[];this._removeVNode(r,t)}}}}return{install:(s,n)=>{const e=new Map;u.keybinds.forEach(o=>e.set(o.keycode,o)),n==null||n.keybinds.forEach(o=>e.set(o.keycode,o));const t=new h(e);s.directive("nav",t),document.addEventListener("keydown",o=>{t.handleKeyboardEvent(o)}),window.addEventListener("focusin",o=>{t.handleFocusEvent(o)})}}});