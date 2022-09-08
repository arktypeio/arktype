import { bench } from "@re-/assert"
import { type } from "../../../../index.js"

bench("validate undefined", () => {
    type("string?").check(undefined)
})
    .median(`108.00ns`)
    .type(`138 instantiations`)

bench("validate string", () => {
    type("string?").check("test")
}).median(`114.00ns`)

const deepStringDef = "string|".repeat(20).slice(0, -1)

bench("parse deeep", () => {
    type(deepStringDef as any)
}).median(`6.08us`)

bench("parse and validate deeep", () => {
    type(deepStringDef as any).check("test")
}).median(`6.13us`)

bench("parseUnion", () => {
    const result = type("string|number")
})
    .median(`983.00ns`)
    .type(`688 instantiations`)

// Marked as any so that we can still measure instantiations in parse union
const smallUnion = type("string|number" as any)

bench("validate small union second", () => {
    smallUnion.check(5)
}).median(`172.00ns`)

bench("validate small union first", () => {
    smallUnion.check("")
}).median(`72.00ns`)

bench("parse large union", () => {
    type("1|2|3|4|5|6|7|8|9")
})
    .median(`1.60us`)
    .type(`2565 instantiations`)

bench("parse then validate large union", () => {
    type("1|2|3|4|5|6|7|8|9").check(5)
}).median(`2.21us`)

bench("parse then validate large union first", () => {
    type("1|2|3|4|5|6|7|8|9").check(1)
}).median(`1.65us`)

bench("parse then validate large union miss", () => {
    type("1|2|3|4|5|6|7|8|9").check(10)
}).median(`5.67us`)

bench("list type", () => {
    type("string[]").check(["hi", "there", "we're", "strings", 5])
})
    .median(`1.14us`)
    .type(`126 instantiations`)
