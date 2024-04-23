<script setup lang="ts">
import { computed } from 'vue';
import { VNavBinding } from '../lib/v-nav';


</script>

<template>
  <div>
    <div v-for="i in nums" v-nav:num="vnavBinding(i)" :key="i">{{ i }}</div>
  </div>

</template>

<script lang="ts">
// @ts-expect-error
  const nums = computed(() => new Array(10).fill("").map((x, i) => i))
  const vnavBinding = computed(() => (x: any) => {
    return {
      key: `${x}`
    } as VNavBinding
  })
</script>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
