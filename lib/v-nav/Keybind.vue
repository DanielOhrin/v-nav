<template>
  <div class="keybind">
    <h4>{{ action.name }}</h4>
    <p>{{ action.description }}</p>
    <span v-for="(key, i) in action.keys" :key="'key-' + i">
      <span v-for="(subKey, j) of keyToArray(key)" :key="'key-' + i + '-' + j">
        <span v-if="subKey === '+'">{{ subKey }}</span>
        <kbd v-else>{{ subKey }}</kbd>
      </span>
      <span v-if="i !== action.keys.length - 1"> OR </span>
    </span>
  </div>
</template>

<script setup lang="ts">
  import { PropType } from "vue"
  import { Action, Key } from "~/plugins/vnav"

  defineProps({
    action: {
      type: Object as PropType<Action>,
      required: true
    }
  })

  function keyToArray(key: Key) {
    const { code, altKey: alt, shiftKey: shift, ctrlKey: ctrl } = key

    const arr: string[] = []

    if (ctrl === true) arr.push("Ctrl")
    if (shift) arr.push("Shift")
    if (alt) arr.push("Alt")

    return [...arr, code].join(" + ").split(" ")
  }
</script>

<style lang="scss" scoped>
  kbd {
    background-color: #eee;
    border-radius: 3px;
    border: 1px solid #b4b4b4;
    box-shadow: 0 1px 1px rgba(0, 0, 0, 0.2),
      0 2px 0 0 rgba(255, 255, 255, 0.7) inset;
    color: #333;
    display: inline-block;
    font-size: 0.85em;
    font-weight: 700;
    line-height: 1;
    padding: 2px 4px;
    white-space: nowrap;
  }
</style>
