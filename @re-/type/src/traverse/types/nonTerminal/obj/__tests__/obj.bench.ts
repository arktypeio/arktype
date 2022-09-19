import { bench } from "@re-/assert"
import { type } from "../../../../../index.js"

bench("validate map", () => {
    type({
        a: "string?",
        b: "number?",
        c: { nested: "boolean?" }
    }).check({
        a: "okay",
        b: 5,
        c: { nested: true }
    })
})
    .median(`1.37us`)
    .type(`530 instantiations`)

bench("validate map extraneous", () => {
    type({
        a: "string?",
        b: "number?",
        c: { nested: "boolean?" }
    }).check({
        a: "okay",
        b: 5,
        c: { nested: true },
        d: true,
        e: true,
        f: {},
        g: true
    })
}).median(`1.54us`)

bench("validate map bad", () => {
    type({
        a: "string?",
        b: "number?",
        c: { nested: "boolean?" }
    }).check({
        a: 5,
        b: 5,
        c: { nested: true }
    })
}).median(`1.93us`)

bench("validate tuple", () => {
    type(["string?", "number?", ["boolean?"]]).check(["okay", 5, [true]])
})
    .median(`1.44us`)
    .type(`931 instantiations`)

bench("errors at paths", () => {
    type({
        a: "string|number",
        b: "boolean?",
        c: { nested: ["undefined|null", "bigint"] }
    }).check({ a: [], b: "hi", c: { nested: [true, 5] } })
}).median(`7.35us`)
