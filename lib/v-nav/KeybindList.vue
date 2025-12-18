<template>
  <div class="keybind-list">
    <Keybind
      v-for="(action, i) in actions"
      :action="action"
      :key="'action-' + i"
    />
  </div>
</template>

<script setup lang="ts">
  import { PropType } from "vue"
  import { Action } from "~/plugins/vnav"
  import Keybind from "./Keybind.vue"

  defineProps({
    actions: {
      type: Array as PropType<Array<Action>>,
      required: true
    }
  })
</script>

<style lang="scss" scoped>
  .keybind-list {
    display: flex;
    flex-flow: column nowrap;
    .keybind {
      margin: 10px 5px;
    }
  }
</style>
