import { bench } from "@re-/assert"
import { space } from "../../src/index.js"
import {
    cyclic10,
    cyclic100,
    cyclic250,
    cyclic50,
    cyclic500
} from "./generated/cyclic.js"

bench("cyclic(10)", () => {
    const cyclic10Space = space(cyclic10)
})
    .median("2.16ms")
    .type.median("68.03ms")

bench("cyclic(50)", () => {
    const cyclic50Space = space(cyclic50)
})
    .median("41.50ms")
    .type.median("72.89ms")

bench("cyclic(100)", () => {
    const cyclic100Space = space(cyclic100)
})
    .median("150.84ms")
    .type.median("165.87ms")

bench("cyclic(250)", () => {
    const cyclic250Space = space(cyclic250)
})
    .median("10.48s")
    .type.median("172.91ms")

bench("cyclic(500)", () => {
    const cyclic500Space = space(cyclic500)
})
    .median("45.25s")
    .type.median("442.49ms")
