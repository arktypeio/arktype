import { bench } from "@re-/assert"
import { type } from "../../../../index.js"

bench("validate undefined", () => {
    type("string?").check(undefined)
})
    .median(`155.00ns`)
    .type(`151in`)

bench("validate string", () => {
    type("string?").check("test")
}).median(`157.00ns`)

const deepStringDef = "string|".repeat(20).slice(0, -1)

bench("parse deeep", () => {
    type(deepStringDef as any)
}).median(`6.42us`)

bench("parse and validate deeep", () => {
    type(deepStringDef as any).check("test")
}).median(`6.54us`)

bench("parseUnion", () => {
    const result = type("string|number")
})
    .median(`1.07us`)
    .type(`742in`)

// Marked as any so that we can still measurein in parse union
const smallUnion = type("string|number" as any)

bench("validate small union second", () => {
    smallUnion.check(5)
}).median(`287.00ns`)

bench("validate small union first", () => {
    smallUnion.check("")
}).median(`79.00ns`)

bench("parse large union", () => {
    type("1|2|3|4|5|6|7|8|9")
})
    .median(`1.64us`)
    .type(`2606in`)

bench("parse then validate large union", () => {
    type("1|2|3|4|5|6|7|8|9").check(5)
}).median(`3.03us`)

bench("parse then validate large union first", () => {
    type("1|2|3|4|5|6|7|8|9").check(1)
}).median(`1.65us`)

bench("parse then validate large union miss", () => {
    type("1|2|3|4|5|6|7|8|9").check(10)
}).median(`4.74us`)

bench("list type", () => {
    type("string[]").check(["hi", "there", "we're", "strings", 5])
})
    .median(`1.23us`)
    .type(`132in`)
