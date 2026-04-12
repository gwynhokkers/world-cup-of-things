import {
  createError,
  defineEventHandler,
  getRouterParam,
  readBody as h3ReadBody
} from 'h3'

Object.assign(globalThis, {
  authorize: async () => {
    /* tests allow by default */
  },
  createError,
  defineEventHandler,
  getRouterParam,
  readBody: h3ReadBody
})
