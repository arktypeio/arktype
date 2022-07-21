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
    .median(`1.19us`)
    .type()
    .median(`40.13ms`)

bench("cyclic eager(10)", () => {
    const cyclic10Space = space(cyclic10, eagerConfig)
}).median(`35.23us`)

bench("cyclic(50)", () => {
    const cyclic50Space = space(cyclic50)
})
    .median(`26.83us`)
    .type()
    .median(`75.10ms`)

bench("cyclic eager(50)", () => {
    const cyclic50Space = space(cyclic50, eagerConfig)
}).median(`204.17us`)

bench("cyclic(100)", () => {
    const cyclic100Space = space(cyclic100)
})
    .median(`54.83us`)
    .type()
    .median(`117.48ms`)

bench("cyclic eager(100)", () => {
    const cyclic100Space = space(cyclic100, eagerConfig)
}).median(`428.02us`)

bench("cyclic(250)", () => {
    const cyclic250Space = space(cyclic250)
})
    .median(`140.75us`)
    .type()
    .median(`259.14ms`)

bench("cyclic eager(250)", () => {
    const cyclic250Space = space(cyclic250, eagerConfig)
}).median(`1.36ms`)

bench("cyclic(500)", () => {
    const cyclic500Space = space(cyclic500)
})
    .median(`308.43us`)
    .type()
    .median(`572.96ms`)

bench("cyclic eager(500)", () => {
    const cyclic500Space = space(cyclic500, eagerConfig)
}).median(`2.71ms`)
