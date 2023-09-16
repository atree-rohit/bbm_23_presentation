<template>
    <div class="switcher switcher-sm text-center py-2 bg-dark">
        <div class="btns-row">
            <span class="row-label">Page</span>
            <button
                class="btn"
                v-for="p in pages"
                :key="p"
                :class="p === page ? 'btn-success' : 'btn-outline-light bg-light'"
                @click="page = p"
                v-text="p"
            />
        </div>
    </div>
    <map-component v-if="page == 'Map'" />
    <species-lists v-if="page == 'List'" />
    <clusters v-if="page == 'Cluster'" />
    <district-patterns v-if="page == 'District Patterns'" />
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useStore } from "vuex"
import MapComponent from "./components/MapComponent.vue"
import SpeciesLists from "./components/SpeciesLists.vue"
import Clusters from "./components/Clusters.vue"
import DistrictPatterns from "./components/DistrictPatterns.vue"

const store = useStore()
const pages = ["Map", "List", "Cluster", "District Patterns"]
const page = ref("List")

onMounted(() => {
    store.dispatch("init")
})
</script>


<style scoped>
</style>
