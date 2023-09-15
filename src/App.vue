<template>
  <map-component />
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import MapComponent from './components/MapComponent.vue'
import { useStore } from 'vuex'

const store = useStore()

onMounted(() => {
  store.dispatch('init')
})


</script>


<style scoped>

</style>
