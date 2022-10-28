const { Model } = require('objection')
const i18next = require('i18next')
const { Event } = require('../services/initialization')
const getAreaSql = require('../services/functions/getAreaSql')
const {
  api: { searchResultsLimit, queryLimits },
  defaultFilters: {
    nests: { avgFilter },
  },
} = require('../services/config')
const fetchNests = require('../services/api/fetchNests')

module.exports = class Nest extends Model {
  static get tableName() {
    return 'nests'
  }

  static get idColumn() {
    return 'nest_id'
  }

  static async getAll(perms, args) {
    const { areaRestrictions } = perms
    const { minLat, minLon, maxLat, maxLon, filters } = args
    const pokemon = []
    Object.keys(filters).forEach((pkmn) => {
      if (!pkmn.startsWith('o')) {
        pokemon.push(pkmn.split('-')[0])
      }
    })
    const query = this.query()
      .select(['*', 'nest_id AS id'])
      .whereBetween('lat', [minLat, maxLat])
      .andWhereBetween('lon', [minLon, maxLon])
      .whereIn('pokemon_id', pokemon)
    if (filters.id) {
      query.orWhere('nest_id', filters.id)
    }
    if (!avgFilter.every((x, i) => x === filters.onlyAvgFilter[i])) {
      query.andWhereBetween('pokemon_avg', filters.onlyAvgFilter)
    }

    if (!getAreaSql(query, areaRestrictions, filters.onlyAreas || [])) {
      return []
    }
    const results = await query.limit(queryLimits.nests)

    const fixedForms = (queryResults) => {
      const returnedResults = []
      queryResults.forEach((pkmn) => {
        if (pkmn.pokemon_form == 0 || pkmn.pokemon_form === null) {
          const formId = Event.masterfile.pokemon[pkmn.pokemon_id].defaultFormId
          if (formId) pkmn.pokemon_form = formId
        }
        if (filters[`${pkmn.pokemon_id}-${pkmn.pokemon_form}`]) {
          returnedResults.push(pkmn)
        }
      })
      return returnedResults
    }
    return fixedForms(results)
  }

  static async getAvailable() {
    const results = await this.query()
      .select(['pokemon_id', 'pokemon_form'])
      .groupBy('pokemon_id', 'pokemon_form')
      .orderBy('pokemon_id', 'asc')

    return {
      available: results.length
        ? results.map((pokemon) => {
            if (pokemon.pokemon_form == 0 || pokemon.pokemon_form === null) {
              return `${pokemon.pokemon_id}-${
                Event.masterfile.pokemon[pokemon.pokemon_id].defaultFormId || 0
              }`
            }
            return `${pokemon.pokemon_id}-${pokemon.pokemon_form || 0}`
          })
        : fetchNests(),
    }
  }

  static async search(perms, args, { isMad }, distance) {
    const { search, locale, onlyAreas = [] } = args
    const pokemonIds = Object.keys(Event.masterfile.pokemon).filter((pkmn) =>
      i18next.t(`poke_${pkmn}`, { lng: locale }).toLowerCase().includes(search),
    )
    const query = this.query()
      .select([
        'nest_id AS id',
        'name',
        'lat',
        'lon',
        'pokemon_id AS nest_pokemon_id',
        'pokemon_form AS nest_pokemon_form',
        distance,
      ])
      .whereIn('pokemon_id', pokemonIds)
      .limit(searchResultsLimit)
      .orderBy('distance')
    if (!getAreaSql(query, perms.areaRestrictions, onlyAreas, isMad)) {
      return []
    }
    return query
  }

  static getOne(id) {
    return this.query().findById(id).select(['lat', 'lon'])
  }
}
