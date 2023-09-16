<style>
table{
    border-collapse: collapse;
}
th{
    background-color: rgb(100, 0, 0);
    cursor: s-resize;
}
th, td{
    border: 1px solid rgb(100, 0, 0);
    padding: 0.05rem .5rem;
}
th.sorted{
    background-color: rgb(180, 0, 0);    
}
th:hover{
    background-color: rgb(140, 0, 0);    
}

td{
    font-size: 0.9rem;
}

tbody tr:hover{
    background-color: rgb(0, 100, 0);    

}

circle{
    fill-opacity: .1;
    stroke-width: 2px;
}

.circle-label{
    opacity: 0.15;
    fill: red;
}
.circle-label:hover{
    opacity: 1;
}

</style>
<template>
    <div class="switcher switcher-sm text-center py-2 bg-dark">
        <div class="btns-row">
            <span class="row-label">Ranks</span>
            <button
				class="btn"
				:class="taxa_rank === null ? 'btn-success' : 'btn-outline-light bg-light'"
				@click="taxa_rank = null"
				v-text="`All`"
			/>
            <button
                class="btn"
                v-for="tr in taxa_ranks"
                :key="tr"
                :class="tr === taxa_rank ? 'btn-success' : 'btn-outline-light bg-light'"
                @click="taxa_rank = tr"
                v-text="tr"
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
		</div>
        <div class="btns-row">
			<span class="row-label">Portal</span>
			<button
				class="btn"
				:class="portal === null ? 'btn-success' : 'btn-outline-light bg-light'"
				@click="portal = null"
				v-text="`All`"
			/>
			<button
				class="btn"
				v-for="p in portals"
				:key="p"
				:class="p === portal ? 'btn-success' : 'btn-outline-light bg-light'"
				@click="portal = p"
				v-text="p"
			/>
		</div>
    </div>
    
    <table class="table">
        <thead>
            <tr>
                <th>No</th>
                <th>User</th>
                <th>Observations</th>
                <th>Portals</th>
                <th>States</th>
                <th>Districts</th>
                <th>Years</th>
            </tr>
        </thead>

        <tbody>
            <tr
                v-for="(row, r) in filtered_users"
                :key="r"
            >
                <td>{{ r+1 }}</td>
                <td>{{ row.user }}</td>
                <td>{{ row.observations }}</td>
                <td>{{ row.portals.join(", ") }}</td>
                <td>{{ row.states.join(", ") }}</td>
                <td>{{ row.districts.length }}</td>
                <td>{{ row.years.join(", ") }}</td>

            </tr>
        </tbody>
    </table>
    <table v-if="false">
        <thead>
            <tr>
                <th>Sl. No</th>
                <th
                    v-for="(col, c) in columns"
                    :key="c"
                    @click="sortCol(col)"
                    :class="{sorted: sort_column == col.value}"
                >
                    {{ col.name }}
                    <template v-if="sort_column == col.value">
                        <span v-text="sort_direction == 'asc' ? '◭' : '⧩'" />
                    </template>
                </th>
                
            </tr>
        </thead>
        <tbody>
            <tr
                v-for="(row, r) in sorted_table_data"
                :key="r"
            >
                <td v-text="r + 1"/>
                <td v-text="row.id"/>
                <td><i>{{row.scientific_name}}</i></td>
                <td v-text="row.common_name"/>
                <td v-text="row.rank"/>
                <td v-text="row.observations"/>
                <td v-text="row.users"/>
                <td v-text="row.states"/>
                <td v-text="row.districts"/>
                <td v-text="row.years"/>
            </tr>
        </tbody>
    </table>
    
</template>

<script setup>
import { ref, computed, onMounted } from "vue"
import { useStore } from "vuex"
import * as d3 from "d3"

const store = useStore()

const all_observations = computed(() => store.state.all_observations)
const all_taxa = computed(() => store.state.taxa)

const years = [20, 21, 22, 23]
const year = ref(null)
const portals = ["counts","inat","ibp","ifb"]
const portal = ref(null)

const columns = [
    {name: "ID", value: "id", sort_type:"number"},
    {name: "Scientific Name", value: "scientific_name", sort_type:"text"},
    {name: "Common Name", value: "common_name", sort_type:"text"},
    {name: "Rank", value: "rank", sort_type:"text"},
    {name: "Observations", value: "observations", sort_type:"number"},
    {name: "Users", value: "users", sort_type:"number"},
    {name: "States", value: "states", sort_type:"number"},
    {name: "Districts", value: "districts", sort_type:"number"},
    {name: "Years", value: "years", sort_type:"text"},
]

const sort_column = ref("observations")
const sort_direction = ref("desc")

const taxa_ranks = ref(["superfamily","family","subfamily","tribe", "genus","species"])
const taxa_rank = ref("species")

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

const filtered_table_data = computed(() => {
    let op = table_data.value
    if(year.value != null){
        op = op.filter((t) => t.years.includes(year.value))
    }
    if(taxa_rank.value != null){
        op = op.filter((t) => t.rank == taxa_rank.value)
    }
    
    return op
})

const sorted_table_data = computed(() => {
    const op = [...filtered_table_data.value]
    const sort_col = columns.find((c) => c.value == sort_column.value)
    op.sort((a, b) => {
        if(sort_col.sort_type == "text"){
            if(sort_direction.value == "asc"){
                return a[sort_column.value].localeCompare(b[sort_column.value])
            }
            return b[sort_column.value].localeCompare(a[sort_column.value])
        }
        if(sort_direction.value == "asc"){
            return a[sort_column.value] - b[sort_column.value]
        }
        return b[sort_column.value] - a[sort_column.value]
    })
    console.log(grouped_data(op, "observations"))
    return op
})

const getYears = (observations) => {
    const years = getUnique(observations.map((o) => {
        const date = o.date.split("-")
        return date[0] - 2000
    })).sort()
    
    return years.join(", ")
}

const sortCol = (col) => {
    if(sort_column.value == col.value){
        sort_direction.value = sort_direction.value == "asc" ? "desc" : "asc"
        return
    } 
    sort_column.value = col.value
    sort_direction.value = 'desc'
}

const getUnique = (arr) => {
    return [...new Set(arr)]
}



const grouped_data = (data, field) => {
    const grouped = d3.groups(data, (t) => t[field])
    const groups = {
        1000: 0,
        800:0,
        600:0,
        500:0,
        400:0,
        300:0,
        200:0,
        100:0,
        80:0,
        60:0,
        40:0,
        30:0,
        20:0,
        10:0,
        5:0,
        4:0,
        3:0,
        2:0,
        1:0,
    }
    grouped.forEach((g) => {
        const key = g[0]
        const value = g[1].length
        
        const keys = Object.keys(groups).map((k) => parseInt(k)).reverse()
        
        for(let i = 0; i < keys.length; i++){
            if(key >= keys[i]){
                groups[keys[i]] += value
                break
            }
        }
    })
    
    return groups
}

const user_data = computed(() => {
    const grouped = d3.groups(all_observations.value, (o) => o.user)
    const data = []
    grouped.forEach((g) => {
        const user = g[0]
        const observations = g[1]
        const portals = getUnique(observations.map((o) => o.portal))
        const states = getUnique(observations.map((o) => o.state))
        const districts = getUnique(observations.map((o) => o.district))
        const years = getUnique(observations.map((o) => o.date.split("-")[0]))
        data.push({
            user,
            observations: observations.length,
            portals: portals,
            states,
            districts,
            years,
        })
    })
    return data
})

const filtered_users = computed(() => {
    let op = user_data.value
    if(year.value != null){
        const year_actual = year.value + 2000
        console.log(year_actual)
        op = op.filter((t) => t.years.map((y) => parseInt(y)).includes(year_actual))
    }
    if(portal.value != null){
        op = op.filter((t) => t.portals.includes(portal.value))
    }
    console.log(grouped_data(op, "observations"))
    return op.sort((a, b) => b.observations - a.observations)
})


</script>