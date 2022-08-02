import { bench } from "@re-/assert"
import { space, type } from "../../index.js"

bench("validate undefined", () => {
    type("string?").validate(undefined)
})
    .median(`111.00ns`)
    .type(`125 instantiations`)

bench("validate string", () => {
    type("string?").validate("test")
}).median(`112.00ns`)

const deepStringDef = "string|".repeat(20).slice(0, -1)

bench("parse deeep", () => {
    type(deepStringDef as any)
}).median(`5.62us`)

bench("parse and validate deeep", () => {
    type(deepStringDef as any).validate("test")
}).median(`5.72us`)

bench("validate map", () => {
    type({
        a: "string?",
        b: "number?",
        c: { nested: "boolean?" }
    }).validate({
        a: "okay",
        b: 5,
        c: { nested: true }
    })
})
    .median(`1.87us`)
    .type(`553 instantiations`)

bench("validate map extraneous", () => {
    type({
        a: "string?",
        b: "number?",
        c: { nested: "boolean?" }
    }).validate({
        a: "okay",
        b: 5,
        c: { nested: true },
        d: true,
        e: true,
        f: {},
        g: true
    })
}).median(`6.14us`)

bench("validate map bad", () => {
    type({
        a: "string?",
        b: "number?",
        c: { nested: "boolean?" }
    }).validate({
        a: 5,
        b: 5,
        c: { nested: true }
    })
}).median(`6.30us`)

bench("validate tuple", () => {
    type(["string?", "number?", ["boolean?"]]).validate(["okay", 5, [true]])
})
    .median(`2.09us`)
    .type(`953 instantiations`)

bench("validate regex", () => {
    type(/.*/).validate("test")
})
    .median(`98.00ns`)
    .type(`58 instantiations`)

bench("parseUnion", () => {
    const result = type("string|number")
})
    .median(`858.00ns`)
    .type(`930 instantiations`)

// Marked as any so that we can still measure instantiations in parse union
const smallUnion = type("string|number" as any)

bench("validate small union second", () => {
    smallUnion.validate(5)
}).median(`214.00ns`)

bench("validate small union first", () => {
    smallUnion.validate("")
}).median(`108.00ns`)

bench("parse large union", () => {
    type("1|2|3|4|5|6|7|8|9")
})
    .median(`1.44us`)
    .type(`2604 instantiations`)

bench("parse then validate large union", () => {
    type("1|2|3|4|5|6|7|8|9").validate(5)
}).median(`2.36us`)

bench("parse then validate large union first", () => {
    type("1|2|3|4|5|6|7|8|9").validate(1)
}).median(`1.71us`)

bench("parse then validate large union miss", () => {
    type("1|2|3|4|5|6|7|8|9").validate(10)
}).median(`7.72us`)

bench("errors at paths", () => {
    type({
        a: "string|number",
        b: "boolean?",
        c: { nested: ["undefined|null", "bigint"] }
    }).validate({ a: [], b: "hi", c: { nested: [true, 5] } })
}).median(`12.88us`)

bench("list type", () => {
    type("string[]").validate(["hi", "there", "we're", "strings", 5])
})
    .median(`6.54us`)
    .type(`105 instantiations`)

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
    recursive.dejaVu.validate(dejaVu)
}).median(`87.13us`)
