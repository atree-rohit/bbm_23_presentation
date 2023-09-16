<template>
    <div>
        <h1>Butterfly Taxa and District Patterns</h1>
        <div>
            <select v-model="selectedTaxa">
                <option value="">Select Taxa</option>
                <option
                    v-for="(taxon, t) in taxaData"
                    :key="t"
                    :value="taxon.taxaId"
                    v-text="taxon.scientificName"
                />
            </select>
        </div>
        <div>
            <select v-model="selectedDistrict">
                <option value="">Select District</option>
                <option
                    v-for="(district, d) in districtData"
                    :key="d"
                    :value="district.district"
                    v-text="district.district"
                />
            </select>
        </div>
        <div>
            <button @click="generateChart">Generate Chart</button>
        </div>
        <div id="d3Chart"></div>
    </div>
</template>
  
<script setup>

import { ref, computed, onMounted, watch } from 'vue'
import * as d3 from 'd3'

import { useStore } from 'vuex'

const store = useStore()
const selectedTaxa = ref("")
const selectedDistrict = ref("")
const all_observations = computed(() => store.state.all_observations)
const all_taxa = computed(() => store.state.taxa)
const taxaData = ref([]) 
const districtData = ref([])

const species_observations = computed(() => {
    const taxaMap = new Map(all_taxa.value.map(t => [t.id, t]));

    const op = all_observations.value
        .filter((o) => o.taxa != null)
        .map((o) => {
            const taxa = taxaMap.get(o.taxa);
            return {
                ...o,
                taxa_details: taxa || null
            };
        })
        .filter((o) => o.taxa_details && o.taxa_details.rank === "species");

    return op;
});


function clusterData(data, k, maxIterations) {
    // Use the provided k-means clustering function
    const clusters = kMeansClustering(data, k, maxIterations);
    return clusters;
}

function getUnique(arr) {
    return [...new Set(arr)];
}

function getYears(arr) {
    const years = arr.map((o) => o.year);
    return getUnique(years).sort();
}

function getDistricts(arr) {
    const districts = arr.map((o) => o.district);
    return getUnique(districts).sort();
}

function getStates(arr) {
    const states = arr.map((o) => o.state);
    return getUnique(states).sort();
}

function getTaxa(arr) {
    const taxa = arr.map((o) => o.taxa);
    return getUnique(taxa).sort();
}

function getTaxaData() {
    const taxaMap = new Map(all_taxa.value.map(t => [t.id, t]));

    const op = all_observations.value
        .filter((o) => o.taxa != null)
        .map((o) => {
            const taxa = taxaMap.get(o.taxa);
            return {
                ...o,
                taxa_details: taxa || null
            };
        })
        .filter((o) => o.taxa_details && o.taxa_details.rank === "species");

    const grouped = d3.group(op, d => d.taxa_details.id);
    const data = [];
    for (const [taxaId, observations] of grouped) {
        const taxa = all_taxa.value.find(t => t.id === taxaId);
        if (taxa) {
            data.push({
                taxaId,
                scientificName: taxa.name,
                commonName: taxa.common_name ?? "",
                rank: taxa.rank,
                observations: observations.length,
                states: getStates(observations).length,
                districts: getDistricts(observations).length,
                years: getYears(observations),
                users: getUnique(observations.map((o) => o.user)).length,
            });
        }
    }
    taxaData.value = data;
}

function getDistrictData() {
    const taxaMap = new Map(all_taxa.value.map(t => [t.id, t]));

    const op = all_observations.value
        .filter((o) => o.taxa != null)
        .map((o) => {
            const taxa = taxaMap.get(o.taxa);
            return {
                ...o,
                taxa_details: taxa || null
            };
        })
        .filter((o) => o.taxa_details && o.taxa_details.rank === "species");

    const grouped = d3.group(op, d => d.district);
    const data = [];
    for (const [district, observations] of grouped) {
        data.push({
            district,
            observations: observations.length,
            taxa: getTaxa(observations).length,
            states: getStates(observations).length,
            years: getYears(observations),
            users: getUnique(observations.map((o) => o.user)).length,
        });
    }
    districtData.value = data;
}

onMounted(() => {
    getTaxaData();
    getDistrictData();
    const clustered_data = clusterData(districtData.value, 4, 500)
    console.log(clustered_data)
})

// console.log(taxaData.value)
function euclideanDistance(point1, point2) {
    return Math.sqrt(
        (point1.x - point2.x) ** 2 + (point1.y - point2.y) ** 2
    )
}

function initializeCentroids(data, k) {
    const centroids = [];
    const dataCopy = [...data];
    for (let i = 0; i < k; i++) {
        const randomIndex = Math.floor(Math.random() * dataCopy.length);
        centroids.push(dataCopy.splice(randomIndex, 1)[0]);
    }
    return centroids;
}

function kMeansClustering(data, k, maxIterations) {
    let clusters
    let centroids = initializeCentroids(data, k);

    for (let iteration = 0; iteration < maxIterations; iteration++) {
        clusters = new Array(k).fill(null).map(() => []);

        for (const point of data) {
            let minDistance = Infinity;
            let closestCentroidIndex = -1;

            for (let i = 0; i < k; i++) {
                const distance = euclideanDistance(point, centroids[i]);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestCentroidIndex = i;
                }
            }
            clusters[closestCentroidIndex].push(point);
        }

        for (let i = 0; i < k; i++) {
            const cluster = clusters[i];
            if (cluster.length > 0) {
                const sumX = cluster.reduce((acc, point) => acc + point.x, 0);
                const sumY = cluster.reduce((acc, point) => acc + point.y, 0);
                centroids[i] = {
                    x: sumX / cluster.length,
                    y: sumY / cluster.length
                };
            }
        }
    }

    return clusters;
}

function visualizeClusters(clusteredData) {
    const width = 800; // Adjust as needed
    const height = 400; // Adjust as needed

    // Create an SVG element
    const svg = d3.select("#d3Chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height);

    // Define colors for clusters
    const clusterColors = d3.scaleOrdinal(d3.schemeCategory10);

    // Define scales for x and y axes (based on your data)
    const xScale = d3.scaleLinear()
        .domain([/* Define domain */])
        .range([0, width]);

    const yScale = d3.scaleLinear()
        .domain([/* Define domain */])
        .range([height, 0]);

    // Create circles for each data point and assign colors based on clusters
    svg.selectAll("circle")
        .data(clusteredData.flat()) // Flatten the clustered data
        .enter()
        .append("circle")
        .attr("cx", d => xScale(/* x value */))
        .attr("cy", d => yScale(/* y value */))
        .attr("r", 5)
        .style("fill", (d, i) => clusterColors(i)); // Assign colors based on cluster

    // You can add labels, tooltips, or other visual elements as needed

    // Add axes (if needed)
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(xAxis);

    svg.append("g")
        .attr("class", "y-axis")
        .call(yAxis);
}


const generateChart = () => {
    // console.log(Object.keys(all_observations.value[0]), Object.keys(all_taxa.value[0]))
    console.log(species_observations.value)
    
    d3.select("#d3Chart").selectAll("*").remove();

    const svg = d3
        .select("#d3Chart")
        .append("svg")
        .attr("width", 400)
        .attr("height", 300);

    // svg
    //     .selectAll("circle")
    //     .data(yourDataArray) // Replace with your data
    //     .enter()
    //     .append("circle")
    //     .attr("cx", (d, i) => i * 30 + 20) // Adjust positioning as needed
    //     .attr("cy", (d) => yourScaleFunction(d)) // Replace with appropriate scale
    //     .attr("r", (d) => yourRadiusFunction(d)); // Replace with appropriate radius
}

</script>
  
  <style scoped>
/* Add your component-specific styles here */
</style>
  