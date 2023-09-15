import { createStore } from 'vuex'

import data from "../assets/bbm_data.json"
import taxa from "../assets/taxa.json"
import countries from "../assets/maps/countries.json"
import states from "../assets/maps/states.json"
import districts from "../assets/maps/districts_1.json"


export default createStore({
    state: {
        all_observations: [],
        taxa: [],
        users: [],
        geojsons: {}
    },
    getters: {},
    mutations: {
        SET_ALL_OBSERVATIONS(state, observations) {
            state.all_observations = observations
        },
        SET_TAXA(state, taxa) {
            state.taxa = taxa
        },
        SET_USERS(state, users) {
            state.users = users
        },
        SET_GEOJSONS(state){
            state.geojsons = {
                countries: countries,
                states: states,
                districts: districts
            }
        }
    },
    actions: {
        init({ dispatch }) {
            dispatch('initTaxa')
            dispatch('initUsers')
            dispatch('initMaps')
            dispatch('initObservations')
        },
        initObservations({ commit }) {
            const all_data = []
            Object.entries(data.observations).forEach(([portal, observations]) => {
                observations.forEach((observation) => {
                    const state = getState(data.districts[observation[4]])
                    all_data.push({
                        id: observation[0],
                        portal: portal,
                        taxa: observation[1],
                        user: data.users[portal][observation[2]],
                        date: observation[3],
                        // country: country,
                        state: state,
                        district: data.districts[observation[4]]
                    })
                })
            })
            commit('SET_ALL_OBSERVATIONS', all_data)
        },
        initTaxa({ commit }) {
            commit('SET_TAXA', taxa)
        },
        initUsers({ commit }) {
            commit('SET_USERS', data.users)
        },
        initMaps({ commit }) {
            commit('SET_GEOJSONS')
        },

    },
})

function getState(district) {
    return districts.features.find((d) => d.properties.district === district)?.properties.state

}