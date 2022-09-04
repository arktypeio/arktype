import { bench } from "@re-/assert"
import { space, type } from "../index.js"

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
    .median(`1.55us`)
    .type(`525 instantiations`)

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
}).median(`1.63us`)

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
}).median(`2.05us`)

bench("validate tuple", () => {
    type(["string?", "number?", ["boolean?"]]).check(["okay", 5, [true]])
})
    .median(`1.75us`)
    .type(`903 instantiations`)

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

bench("errors at paths", () => {
    type({
        a: "string|number",
        b: "boolean?",
        c: { nested: ["undefined|null", "bigint"] }
    }).check({ a: [], b: "hi", c: { nested: [true, 5] } })
}).median(`7.88us`)

bench("list type", () => {
    type("string[]").check(["hi", "there", "we're", "strings", 5])
})
    .median(`1.14us`)
    .type(`126 instantiations`)

const recursive = space({ dejaVu: { dejaVu: "dejaVu?" } })
const dejaVu: typeof recursive.$root.infer.dejaVu = {}
let i = 0
let current = dejaVu
while (i < 50) {
    current.dejaVu = { dejaVu: {} }
    current = current.dejaVu
    i++
}
bench("validate recursive", () => {
    recursive.dejaVu.check(dejaVu)
}).median(`77.57us`)
