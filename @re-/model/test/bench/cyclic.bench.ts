import { bench } from "@re-/assert"
import { space } from "../../src/index.js"
import {
    cyclic10,
    cyclic100,
    cyclic250,
    cyclic50,
    cyclic500
} from "./generated/cyclic.js"

const eagerConfig = { parse: { eager: true } }

bench("cyclic(10)", () => {
    const cyclic10Space = space(cyclic10)
})
    .median(`1.99us`)
    .type()
    .median(`151.66ms`)

bench("cyclic eager(10)", () => {
    const cyclic10Space = space(cyclic10, eagerConfig)
}).median(`31.26us`)

bench("cyclic(50)", () => {
    const cyclic50Space = space(cyclic50)
})
    .median(`12.58us`)
    .type()
    .median(`155.25ms`)

bench("cyclic eager(50)", () => {
    const cyclic50Space = space(cyclic50, eagerConfig)
}).median(`172.69us`)

bench("cyclic(100)", () => {
    const cyclic100Space = space(cyclic100)
})
    .median(`32.41us`)
    .type()
    .median(`178.53ms`)

bench("cyclic eager(100)", () => {
    const cyclic100Space = space(cyclic100, eagerConfig)
}).median(`361.61us`)

bench("cyclic(250)", () => {
    const cyclic250Space = space(cyclic250)
})
    .median(`135.87us`)
    .type()
    .median(`256.90ms`)

bench("cyclic eager(250)", () => {
    const cyclic250Space = space(cyclic250, eagerConfig)
}).median(`1.05ms`)

bench("cyclic(500)", () => {
    const cyclic500Space = space(cyclic500)
})
    .median(`354.97us`)
    .type()
    .median(`549.15ms`)

bench("cyclic eager(500)", () => {
    const cyclic500Space = space(cyclic500, eagerConfig)
}).median(`2.72ms`)
