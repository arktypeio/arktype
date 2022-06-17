import { bench } from "@re-/assert"
import {
    cyclic10,
    cyclic100,
    cyclic250,
    cyclic50,
    cyclic500
} from "./generated/cyclic.js"
import { compile } from "#src"

bench("cyclic(10)", () => {
    const space = compile(cyclic10)
})
    .median("2.16ms")
    .type.median("68.03ms")

bench("cyclic(50)", () => {
    const space = compile(cyclic50)
})
    .median("41.50ms")
    .type.median("72.89ms")

bench("cyclic(100)", () => {
    const space = compile(cyclic100)
})
    .median("150.84ms")
    .type.median("165.87ms")

bench("cyclic(250)", () => {
    const space = compile(cyclic250)
})
    .median("10.48s")
    .type.median("172.91ms")

bench("cyclic(500)", () => {
    const space = compile(cyclic500)
})
    .median("45.25s")
    .type.median("442.49ms")
