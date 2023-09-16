<template>
    <div id="cluster-container">

    </div>
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useStore } from "vuex"
import * as d3 from "d3"

const store = useStore()

const all_observations = computed(() => store.state.all_observations)
const all_taxa = computed(() => store.state.taxa)
const svg = ref(null)
const noOfClusters = 4

const table_data = computed(() => {
    const op = []
    const grouped_taxa = d3.groups(all_observations.value, d => d.taxa)
    grouped_taxa.forEach((t) => {
        const taxon = all_taxa.value.find((x) => x.id == t[0])
        if(taxon){
            op.push({
                id: t[0],
                scientific_name: taxon.name,
                common_name: taxon.common_name ?? "",
                rank: taxon.rank,
                observations: t[1].length,
                states: d3.groups(t[1], d => d.state).length,
                districts: d3.groups(t[1], d => d.district).length,
                years: getYears(t[1]),
                users: d3.groups(t[1], d => d.user).length,
            })
        }
    } )
    return op
})

const speciesStates = computed(() => {
    const all_species = table_data.value.filter((t) => t.rank == "species")
    const grouped_observations = d3.group(all_observations.value, d => d.taxa)
    const op = []
    all_species.map((s) => {
        const observations = grouped_observations.get(s.id)
        const states = getUnique(observations.map((o) => o.state)).sort()
        op.push({
            id: s.id,
            scientific_name: s.scientific_name,
            common_name: s.common_name,
            states: states.join(", ")
        })
    })
    // const grouped_data = d3.groups(op, d => d.states).sort((a,b) => b[1].length - a[1].length)
    const data = op.map((d) => {
        return {
            ...d,
            x: d.id, 
            y: d.states.split(", ").length || 1 
        };
    });

    const maxIterations = 500
    const clusters = kMeansClustering(data, noOfClusters, maxIterations)
    console.log(op.filter((t) => t.states.split(", ").length > 1))
    // console.log(data, clusters)
    return clusters
})

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

const drawClusters = () => {
    console.log("drawing clusters")
    const width = 1000;
    const height = 700;
    if (!d3.select("#cluster-container svg.svg-content").empty()) {
		d3.select("#cluster-container svg.svg-content").remove()
	}

	svg.value = d3.select("#cluster-container")
		.append("svg")
		.attr("preserveAspectRatio", "xMinYMin meet")
		.attr("width", width)
		.attr("height", height)
		.classed("svg-content", true)

    const clusterColors = d3.scaleOrdinal(d3.schemeCategory10);

        const xScale = d3.scaleLinear()
        .domain([0, d3.max(speciesStates.value.flat().map((d) => d.x))]) 
        .range([0, width-100]);

    const yScale = d3.scaleLinear()
        .domain([0, d3.max(speciesStates.value.flat().map((d) => d.y))]) 
        .range([height, height/10]);
    
    svg.value.selectAll("circle")
        .data(speciesStates.value.flat())
        .enter()
        .append("circle")
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", 10) 
        .style("fill", (d, i) => clusterColors(i % noOfClusters))
        .style("stroke", (d, i) => clusterColors(i % noOfClusters))
    
    // svg.value.selectAll("text")
    //     .data(speciesStates.value.flat())
    //     .enter()
    //     .append("text")
    //     .classed("circle-label", true)
    //     .attr("x", d => xScale(d.x))
    //     .attr("y", d => yScale(d.y))
    //     .attr("dy", -15) // Adjust the label's vertical position
    //     .attr("text-anchor", "middle")
    //     .style("fill", "black") // Adjust label color
    //     .text(d => d.states)

    svg.value.selectAll("text")
        .data(speciesStates.value)
        .enter()
        .append("text")
        .attr("x", width - 90)
        .attr("y", (d, i) => 20 + i * 20)
        .attr("width", "100px")
        .style("fill", (d, i) => clusterColors(i))
        .text((d, i) => `Cluster ${i + 1}`)

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    svg.value.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .call(xAxis);

    svg.value.append("g")
        .attr("class", "y-axis")
        .call(yAxis);
}

const getYears = (observations) => {
    const years = getUnique(observations.map((o) => {
        const date = o.date.split("-")
        return date[0] - 2000
    })).sort()
    
    return years.join(", ")
}

const getUnique = (arr) => {
    return [...new Set(arr)]
}

onMounted(() => {
    drawClusters()
})

</script>