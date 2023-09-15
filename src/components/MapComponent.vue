<style>
.switcher{
	padding:0.25rem 2rem;
	background-color: #444;
}
.switcher-sm .btn {
	font-size: 0.9rem !important;
	margin: .5rem 0.125rem;
}

.btns-row{
	border: 1px solid #555;
	border-radius: 1rem;
	margin: .5rem 0;
	padding: .25rem 1rem;
}
.btns-row .row-label{
	font-size: 1.35rem;
	padding-right: 2rem;
}

#map {
	/* display: flex;
		justify-content: space-around; */
}

#map #map-stats {
	border: 1px solid pink;
	width: 50%;
	margin: 0 5px;
	max-height: 80vh;
	overflow: hidden;
}

#map-container {
	display: flex;
	justify-content: center;
}

.map-boundary path.state-boundary {
	stroke-linejoin: round;
	stroke-width: 0.5;
	stroke: rgba(0, 0, 0, 1);
	fill: none;
}

.map-boundary path:not(.state-boundary) {
	stroke-linejoin: round;
	stroke-width: .25;
	stroke: rgba(0, 0, 0, 0.5);
}

.map-boundary path:not(.state-boundary):hover {
	cursor: pointer;
	fill: beige;
}

.map-boundary .current-state {
	stroke: rgba(0, 50, 255, .75);
	stroke-width: .25px;
	filter: brightness(1.25)
}

.map-boundary .selected-polygon {
	/*fill: #afa;*/
	fill: #ffff55;
	stroke: rgba(255, 50, 0, .75);
	stroke-width: .5px;
}

.poly_text {
	fill: #545;
	font-size: 0.85rem;
	transition: fill .125s;
	text-shadow:
		0px 0px 1px white,
		0px 0px 2px white,
		0px 0px 3px white,
		0px 0px 4px white,
		0px 0px 5px white;
}

.poly_text:hover {
	fill: #00c;
	text-shadow: 0px 0px 5px #fff;
	cursor: pointer;
	font-weight: 1000;
}

.map-points circle {
	stroke-width: .5px;
	stroke: rgba(0, 0, 0, .25);
	fill: transparent;
}

.map-points circle:hover {
	cursor: pointer;
	stroke: rgba(0, 255, 0, .5);
}

svg {
	background: hsl(200, 50%, 75%);
}

.small-text {
	font-size: .85rem;
}

.legendCells:after {
	content: "";
	display: block;
	width: 100%;
	height: 100%;
	background-color: #ffffff;
	border: 1px solid black;
}

.selected-polygon {
	stroke: red !important;
	stroke-width: 1.5px !important;
	z-index: 100;
}

.legendCells .cell text {
	display: flex;
	align-items: center;
}

.d3-tooltip table,
.d3-tooltip tr,
.d3-tooltip td {
	font-size: 0.85rem;
	border: 1px solid white;
	background: black;
}

.d3-tooltip td {
	padding: .5rem 1rem;
}

.mx-5{
	margin: 0 3.5rem !important;
}
</style>

<template>
	<div class="switcher switcher-sm text-center py-2 bg-dark">
		<div class="btns-row">
			<span class="row-label">Map Mode</span>
			<button
				class="btn"
				v-for="pm in modes"
				:key="pm"
				:class="pm === mode ? 'btn-success' : 'btn-outline-light bg-light'"
				@click="mode = pm"
				v-text="capitalizeWords(pm)"
			/>
		</div>
		<div class="btns-row">
			<span class="row-label">Year</span>
			<button
				class="btn"
				:class="year === null ? 'btn-success' : 'btn-outline-light bg-light'"
				@click="year = null"
				v-text="`All`"
			/>
			<button
				class="btn"
				v-for="y in years"
				:key="y"
				:class="y === year ? 'btn-success' : 'btn-outline-light bg-light'"
				@click="year = y"
				v-text="y"
			/>
			<button class="btn mx-5" @click="toggleCycle">{{ isCycling ? 'Pause' : 'Play' }}</button>
		</div>
		<div class="btns-row" v-if="mode == 'states'">
			<span class="row-label">ID level</span>
			<button
				class="btn"
				:class="taxa_level === null ? 'btn-success' : 'btn-outline-light bg-light'"
				@click="taxa_level = null"
				v-text="`All`"
			/>
			<button
				class="btn"
				v-for="tl in taxa_levels"
				:key="tl"
				:class="tl === taxa_level ? 'btn-success' : 'btn-outline-light bg-light'"
				@click="taxa_level = tl"
				v-text="capitalizeWords(tl)"
			/>
		</div>
		<div class="btns-row" v-if="mode == 'states'">
			<span class="row-label">Map Labels</span>
			<button
				class="btn"
				v-for="l in labels"
				:key="l"
				:class="l === label ? 'btn-success' : 'btn-outline-light bg-light'"
				@click="label = l"
				v-text="capitalizeWords(l)"
			/>
		</div>

	</div>
	<div id="map">
		<div id="map-container"></div>
	</div>
	{{ map_data.size }}

</template>


<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import * as d3 from 'd3'
import * as d3Legend from 'd3-svg-legend'

import { useStore } from 'vuex'

const store = useStore()

const modes = ["states", "districts"]
const mode = ref("states")
const years = [2020, 2021, 2022, 2023]
const year = ref(null)
const isCycling = ref(false)
let cycle_interval = null
const taxa_levels = ref(["superfamily","family","subfamily","tribe", "genus","species"])
const taxa_level = ref(null)

const labels = ["observations", "users", "taxa"]
const label = ref("observations")


const polygons = ref(null)
const path = ref(null)
const svg = ref(null)
const height = ref(null)
const width = ref(null)
const projection = ref(null)
const tooltip = ref(null)
const max = ref(null)
const colors = ref(null)
const legend = ref(null)
const zoomTransform = ref(0)

const all_observations = computed(() => store.state.all_observations)
const all_taxa = computed(() => store.state.taxa)
const geojsons = computed(() => store.state.geojsons)

const filtered_observations = computed(() => {
	let op = all_observations.value
	if (year.value) {
		op = op.filter((d) => {
			const date = d.date.split("-")
			return parseInt(date[0]) == year.value
		})
	}
	console.log(taxa_level.value)
	if(taxa_level.value){
		op = op.filter((d) => {
			const taxa = all_taxa.value.find((t) => t.id == d.taxa)
			if(taxa && taxa.rank == taxa_level.value){
				return true
			}
			return false
		})
	}
	return op
})

const map_data = computed(() => {
	if (mode.value == "states") {
		return d3.rollup(filtered_observations.value, (v) => v.length, (d) => d.state)
	} else if (mode.value == "districts") {
		return d3.rollup(filtered_observations.value, (v) => v.length, (d) => d.district)
	}
	return []
})

const mode_key = computed(() => {
	const keyMap = {
		countries: "country",
		states: "state",
		districts: "district"
	}
	return keyMap[mode.value]
})

const zoom = computed(() => {
	return d3.zoom()
		.scaleExtent([0.5, 250])
		.translateExtent([[-0.5 * width.value, -0.75 * height.value], [2.5 * width.value, 2.5 * height.value]])
		.on('zoom', handleZoom)
})

const geojson = computed(() => geojsons.value[mode.value])
watch(geojson, () => init())
watch(filtered_observations, () => init())
watch(label, () => init())

const init = () => {
	console.log("init")
	if (geojson.value && geojson.value.features) {
		init_variables()
		init_tooltip()
		init_legend()
		init_svg()
		render_map()
	} else {
		console.log("No geojson")
	}
}

const init_variables = () => {
	polygons.value = null
	path.value = null
	svg.value = {}
	height.value = window.innerHeight * 0.8
	width.value = window.innerWidth
	if (window.innerWidth < 800) {
		height.value = window.innerHeight * 0.6
		projection.value = d3.geoMercator().scale(600).center([110, 20])
	} else {
		projection.value = d3.geoMercator().scale(1000).center([80, 27.5])
	}
	path.value = d3.geoPath().projection(projection.value)
}

const init_tooltip = () => {
	if (!d3.select("body .d3-tooltip").empty()) {
		d3.select("body .d3-tooltip").remove()
	}

	tooltip.value = d3.select('body')
		.append('div')
		.attr('class', 'd3-tooltip')
		.style('position', 'absolute')
		.style('top', '0')
		.style('z-index', '10')
		.style('visibility', 'hidden')
		.style('padding', '10px')
		.style('background', 'rgba(0,0,0,0.75)')
		.style('border-radius', '4px')
		.style('color', '#fff')
		.text('a simple tooltip')
}

const init_legend = () => {
	max.value = Math.max(...map_data.value.values())
	colors.value = d3.scaleLinear()
		.domain([0, 1, max.value / 3, max.value])
		.range(["#c33", "#488", "#fd0", "#24ff00"])
		.clamp(true)
	legend.value = d3Legend.legendColor()
		.shapeHeight(20)
		.shapeWidth(60)
		.scale(colors.value)
		.labelFormat(d3.format(",.0f"))
		.orient('horizontal')
		.labelOffset(-10)
		.labelAlign("middle")
		.cells(6)
}

const init_svg = () => {
	if (!d3.select("#map-container svg.svg-content").empty()) {
		d3.select("#map-container svg.svg-content").remove()
	}

	svg.value = d3.select("#map-container")
		.append("svg")
		.attr("preserveAspectRatio", "xMinYMin meet")
		.attr("width", width.value)
		.attr("height", height.value)
		.classed("svg-content", true)

	if (!zoomTransform.value) {
		zoomTransform.value = d3.zoomTransform(svg.value.node())
	}

	if (height.value > width.value) {
		legend.value.shapeWidth(35)
			.cells(4)
	}
}

const render_map = () => {
	const base = svg.value.append("g")
		.classed("map-boundary", true)
	const base_text = svg.value.append("g")
		.classed("map-labels", true)
	polygons.value = base.append("g")
		.classed("polygons", true)

	geojson.value.features.forEach((polygon) => {
		drawPolygon(polygon)
		if (mode.value == "states") {
			drawPolygonLabel(base_text, polygon)
		}
	})

	svg.value.append("g")
		.attr("class", "legend")
		.attr("transform", `translate(${width.value * .5}, 25)`)
		.call(legend.value)

	svg.value.call(zoom.value)

	svg.value.call(zoom.value.transform, zoomTransform.value)
}

const drawPolygon = (polygon) => {
	polygons.value
		.append("g")
		.selectAll("path")
		.data([polygon])
		.enter()
		.append("path")
		.attr("d", (d) => path.value(d))
		.attr("id", (d) => getPolygonId(d.properties[mode_key.value]))
		.attr("fill", (d) => color_polygon(d.properties))
		.on('mouseover', (d, i) => {
			tooltip.value.html(hover_text(i.properties))
				.style('visibility', 'visible')
		})
		.on('mousemove', (event, d) => {
			tooltip.value
				.style('top', event.pageY - 10 + 'px')
				.style('left', event.pageX + 10 + 'px')
		})
		.on('mouseout', () => tooltip.value.html(``).style('visibility', 'hidden'))
}

const drawPolygonLabel = (base_text, polygon) => {
	let number = 0
	switch(label.value){
		case "observations": number = getObservationsNo(polygon.properties[mode_key.value])
			break
		case "users": number = getUsersNo(polygon.properties[mode_key.value])
			break
		case "taxa": number = getTaxaNo(polygon.properties[mode_key.value])
			break
		
	}
	
	base_text
		.append("g")
		.selectAll("text")
		.data([polygon])
		.enter()
		.append("text")
		.classed("poly_text", true)
		.attr("x", (h) => path.value.centroid(h)[0])

		.attr("y", (h) => path.value.centroid(h)[1])
		.classed("small-text", true)
		.attr("text-anchor", "middle")
		.text(number)
		.on('mouseover', (d, i) => {
			tooltip.value.html(hover_text(i.properties))
				.style('visibility', 'visible')
		})
		.on('mousemove', (event, d) => {
			tooltip.value
				.style('top', event.pageY - 10 + 'px')
				.style('left', event.pageX + 10 + 'px')
		})
		.on('mouseout', () => tooltip.value.html(``).style('visibility', 'hidden'))
}

const getPolygonId = (name) => {
	let replace_chars = [" ", "&", "(", ")", "."]
	let op = name
	replace_chars.forEach((c) => {
		op = op.replaceAll(c, "_")
	})
	return op
}

const color_polygon = (polygon) => {
	const observations = getObservationsNo(polygon[mode_key.value])
	return colors.value(observations)
}

const getObservationsNo = (name) => {
	return map_data.value.get(name) ?? 0
}

const getUsersNo = (name) => {
	const obs = filtered_observations.value
		.filter((d) => d[mode_key.value] == name)
		.map((o) => o.user)
	return [...new Set(obs)].length
}

const getTaxaNo = (name) => {
	const obs = filtered_observations.value
		.filter((d) => d[mode_key.value] == name)
		.map((o) => o.taxa)
	return [...new Set(obs)].length

}

const hover_text = (properties) => {
	let op = [
		[capitalizeWords(mode_key.value), properties[mode_key.value]],
		["Observations", getObservationsNo(properties[mode_key.value])],
		["Users", getUsersNo(properties[mode_key.value])],
		["Taxa", getTaxaNo(properties[mode_key.value])]
	]
	return createTableHTML(op)
}

const createTableHTML = (data) => "<table>" + data.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`) + "</table>"

const handleZoom = (e) => {
	zoomTransform.value = e.transform
	let text_size = (1 / e.transform.k * .8)
	svg.value.selectAll('.poly_text')
		.attr('transform', e.transform)
		.style('font-size', `${text_size}rem`)
	svg.value.selectAll('path')
		.attr('transform', e.transform)
	svg.value.selectAll('circle')
		.attr('transform', e.transform)
		.attr("r", text_size)
}

const format_number = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")
const capitalizeWords = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1) : ""

const toggleCycle = () => {
	isCycling.value = !isCycling.value
	console.log("here")
	const all_years = [null, 2020,2021,2022,2023]
	if(isCycling.value){
		cycle_interval = setInterval(() => {
			year.value = all_years[(all_years.indexOf(year.value) + 1) % all_years.length]
		}, 1250); // Set the interval to 5 seconds (5000 milliseconds)
	} else {
		clearInterval(cycle_interval)
	}
}

watch(isCycling, (newVal) => {
	if(!newVal){
		clearInterval(cycle_interval)
	}
})

</script>

<!-- 
<script>
import { defineComponent } from 'vue'


export default defineComponent({
    name: "MapComponent",
    emits: ['mode-change', 'polygon-clicked'],
    data() {
        return {
            polygons: null,
            path: null,
            svg: null,
            projection: null,
            colors: null,
            max: null,
            height: 500,
            width: 500,
            zoomTransform: 0,
            tooltip: null,
        }      
    },
    watch:{
        mode(newVal){
            this.$emit('mode-change', newVal)
        },
		data(newVal){
			console.log("data changed")
			// this.init()
		}
    },
    computed:{
        mapData(){
            return this.data[this.mode]
        },
        zoom(){
            return d3.zoom()
                .scaleExtent([0.5, 250])
                .translateExtent([[-0.5 * this.width,-0.75 * this.height],[2.5 * this.width, 2.5 * this.height]])
				.on('zoom', this.handleZoom)
        }
    },
	mounted(){
		// console.log("mounted: initializing")
		// if(this.geojson && this.geojson.features){
		// 	this.init()
		// }
	},
    updated(){
		// console.log("updated: re-initializing")
		// this.init()
	},
    methods: {
        init(){
			console.log("init")
            if(this.geojson && this.geojson.features){
				this.init_variables()
                this.init_legend()
                this.init_svg()
                this.render_map()
            } else {
                console.log("No geojson")
            }
        },
        init_variables(){
            this.polygons = null
            this.path = null
            this.svg = {}
            this.height = window.innerHeight * 0.8
            this.width = window.innerWidth
            if(window.innerWidth < 800){
				this.height = window.innerHeight * 0.6
				this.projection = d3.geoMercator().scale(600).center([110, 20])
			} else {
				this.projection = d3.geoMercator().scale(1000).center([80, 27.5])
			}
			this.path = d3.geoPath().projection(this.projection)
            this.tooltip = this.init_tooltip()
        },
		init_tooltip(){
			if (!d3.select("body .d3-tooltip").empty()) {
				d3.select("body .d3-tooltip").remove()
			}

			return d3.select('body')
						.append('div')
						.attr('class', 'd3-tooltip')
						.style('position', 'absolute')
						.style('top', '0')
						.style('z-index', '10')
						.style('visibility', 'hidden')
						.style('padding', '10px')
						.style('background', 'rgba(0,0,0,0.75)')
						.style('border-radius', '4px')
						.style('color', '#fff')
						.text('a simple tooltip')
		},
        init_legend(){
            this.colors = {}
            this.legend = {}
            this.max = d3.max(this.mapData, (d) => d.value) 
            this.colors = d3.scaleLinear()
                .domain([0,1, this.max/3, this.max])
                .range(["#c33", "#488", "#fd0", "#24ff00"])
                .clamp(true)
            this.legend = d3Legend.legendColor()
								.shapeHeight(20)
								.shapeWidth(60)
								.scale(this.colors)
								.labelFormat(d3.format(",.0f"))
								.orient('horizontal')
								.labelOffset(-10)
								.labelAlign("middle")
								.cells(6)
        },
        init_svg(){
            if (!d3.select("#map-container svg.svg-content").empty()) {
				d3.select("#map-container svg.svg-content").remove()
			}
			this.svg = d3.select("#map-container")
						.append("svg")
							.attr("preserveAspectRatio", "xMinYMin meet")
							.attr("width", this.width)
							.attr("height", this.height)
							.classed("svg-content", true)
			if(!this.zoomTransform){
				this.zoomTransform =  d3.zoomTransform(this.svg.node())
			}

			if(this.height > this.width){
				this.legend.shapeWidth(35)
				.cells(4)
			}
        },
        render_map(){
            let base = this.svg.append("g")
				.classed("map-boundary", true)
				.selectAll("path").append("g")
			let base_text = this.svg.append("g")
				.classed("map-labels", true)
				.selectAll("text").append("g")
			this.polygons = base.append("g")
				.classed("polygons", true)
			
			this.geojson.features.forEach((polygon) => {
				this.drawPolygon(polygon)
			})
			
			this.svg.append("g")
				.attr("class", "legend")
				.attr("transform", "translate("+this.width*.55+", 25)")
				.call(this.legend)
			this.svg.call(this.zoom)

			this.svg.call(this.zoom.transform, this.zoomTransform)
        },


        drawPolygon(polygon){
			this.polygons.append("g")
				.data([polygon])
				.enter().append("path")
				.attr("d", this.path)
				.attr("id", this.getPolygonId(polygon.properties))
				.attr("fill", (d) => this.color_polygon(polygon.properties))
				.on('mouseover', (d, i) => {
					this.tooltip.html(this.hover_text(polygon.properties))
						.style('visibility', 'visible')
				})
				.on('mousemove', (event, d) => {
					this.tooltip
						.style('top', event.pageY - 10 + 'px')
						.style('left', event.pageX + 10 + 'px')
				})
				.on('mouseout', () => this.tooltip.html(``).style('visibility', 'hidden'))
				.on("click", (d, polygon_details) => this.clicked(polygon_details))
		},
		getPolygonId(polygon){
            let op = polygon.region
			let replace_chars = [" ", "&", "(", ")", "."]
			if(polygon.state != undefined){
				op = polygon.state
			}
			if(polygon.district != undefined){
				op = polygon.district
			}
			replace_chars.forEach((c) => {
				op = op.replaceAll(c, "_")
			})
			return op
		},
        clicked(polygon_details) {
			let op = {
				name: polygon_details.properties[this.mode_key],
				value: 0,
				mode: this.mode
			}
			let polygon_data = this.mapData.find((d) => d.name == op.name)
			op.value = polygon_data ? polygon_data.value : 0
			this.$emit('polygon-clicked', op)
		},

        drawPolygonBoundary(polygon){
			this.polygons.append("g")
				.data([polygon])
				.enter().append("path")
				.classed("state-boundary", true)
				.classed("selected-polygon", (d) => {
					return ((this.selected.state && d.properties.state == this.selected.state) 
					|| (this.selected.region && d.properties.region == this.selected.region))
				})
				.attr("properties", (d) => JSON.stringify(d.properties))
				.attr("d", this.path)
				// .attr("id", getPolygonId(polygon.properties))
		},
		drawPolygonLabel(base_text, polygon){
			const polygon_data = this.regional_data[this.polygon_mode].find((d) => d[this.polygon_key] == polygon.properties[this.polygon_key])
			let data = ""
			if(polygon_data){
				data = this.format_number(polygon_data[this.data_mode])
			}
			
			base_text.append("g")
				.data([polygon])
				.enter().append("text")
				.classed("poly_text", true)
				.attr("x", (h) => this.path.centroid(h)[0] )

				.attr("y", (h) => this.path.centroid(h)[1] )
				.classed("small-text", true)
				.attr("text-anchor", "middle")
				.text(data)
				.on('mouseover', () => {
					this.tooltip.html(this.hover_text(polygon.properties))
						.style('visibility', 'visible');
				})
				.on('mousemove', (event, d) => {
					this.tooltip
						.style('top', event.pageY - 10 + 'px')
						.style('left', event.pageX + 10 + 'px')
				})
				.on('mouseout', () => this.tooltip.html(``).style('visibility', 'hidden'))
				.on("click", (d, polygon_details) => this.clicked(polygon_details))
		},
        


        color_polygon(polygon) {
			let polygon_data = this.mapData.find((d) => d.name == polygon[this.mode_key])
			if(polygon_data){
                return this.colors(polygon_data.value)
			}
            return this.colors(0)
        },
        handleZoom(e){
			this.zoomTransform = e.transform
			let text_size = (1/e.transform.k * .8)
            this.svg.selectAll('.poly_text')
                .attr('transform', e.transform)
				.style('font-size', `${text_size}rem`)
            this.svg.selectAll('path')
                .attr('transform', e.transform)
            this.svg.selectAll('circle')
                .attr('transform', e.transform)
				.attr("r", text_size)
        },
        hover_text(properties){
			let op = ["state", "district"].map((key) => `<tr><td>${this.capitalizeWords(key)}</td><td>${properties[key] ? properties[key]: "-"}</td></tr>`)	
            op.push(`<tr><td>${this.tooltip_third_row_label}</td><td>${this.mapData.find((d) => d.name == properties[this.mode_key])?.value || 0}</td></tr>`)
			return `<table border='1' class='d3-tooltip'>${op.join('\n')}</table>`
			
		},
        format_number(num){
			return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
		},
        capitalizeWords(str){
			return str ? str.charAt(0).toUpperCase() + str.slice(1) : ""
		},
    }
})
</script> -->