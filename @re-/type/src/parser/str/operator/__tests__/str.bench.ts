import { bench } from "@re-/assert"
import { type } from "../../../../index.js"

bench("validate undefined", () => {
    type("string?").check(undefined)
})
    .median()
    .type()

bench("validate string", () => {
    type("string?").check("test")
}).median()

const deepStringDef = "string|".repeat(20).slice(0, -1)

bench("parse deeep", () => {
    type(deepStringDef as any)
}).median()

bench("parse and validate deeep", () => {
    type(deepStringDef as any).check("test")
}).median()

bench("parseUnion", () => {
    const result = type("string|number")
})
    .median()
    .type()

// Marked as any so that we can still measurein in parse union
const smallUnion = type("string|number" as any)

bench("validate small union second", () => {
    smallUnion.check(5)
}).median()

bench("validate small union first", () => {
    smallUnion.check("")
}).median()

bench("parse large union", () => {
    type("1|2|3|4|5|6|7|8|9")
})
    .median()
    .type()

bench("parse then validate large union", () => {
    type("1|2|3|4|5|6|7|8|9").check(5)
}).median()

bench("parse then validate large union first", () => {
    type("1|2|3|4|5|6|7|8|9").check(1)
}).median()

bench("parse then validate large union miss", () => {
    type("1|2|3|4|5|6|7|8|9").check(10)
}).median()

bench("array type", () => {
    type("string[]").check(["hi", "there", "we're", "strings", 5])
})
    .median()
    .type()
