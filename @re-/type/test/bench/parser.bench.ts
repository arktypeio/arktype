import { bench } from "@re-/assert"
import { space, type } from "../../src/index.js"

bench("validate undefined", () => {
    type("string?").validate(undefined)
}).median(`68.00ns`)

bench("validate string", () => {
    type("string?").validate("test")
}).median(`125.00ns`)

const deepStringDef = "string|".repeat(20).slice(0, -1)

bench("parse deeep", () => {
    type(deepStringDef as any)
}).median(`206.00ns`)

bench("parse deeep eager", () => {
    type(deepStringDef as any, { parse: { eager: true } })
}).median(`2.31us`)

bench("parse and validate deeep", () => {
    type(deepStringDef as any).validate("test")
}).median(`2.54us`)

const deepPreparsed = type(deepStringDef as any)

bench("validate deeep preparsed", () => {
    deepPreparsed.validate("test")
}).median(`138.00ns`)

bench("validate map", () => {
    type({ a: "string?", b: "number?", c: { nested: "boolean?" } }).validate({
        a: "okay",
        b: 5,
        c: { nested: true }
    })
}).median(`1.87us`)

bench("validate map extraneous", () => {
    type({ a: "string?", b: "number?", c: { nested: "boolean?" } }).validate({
        a: "okay",
        b: 5,
        c: { nested: true },
        d: true,
        e: true,
        f: {},
        g: true
    })
}).median(`6.16us`)

bench("validate map bad", () => {
    type({ a: "string?", b: "number?", c: { nested: "boolean?" } }).validate({
        a: 5,
        b: 5,
        c: { nested: true }
    })
}).median(`6.25us`)

bench("validate tuple", () => {
    type(["string?", "number?", ["boolean?"]]).validate(["okay", 5, [true]])
}).median(`1.50us`)

bench("validate regex", () => {
    type(/.*/).validate("test")
}).median(`135.00ns`)

bench("validate literal", () => {
    type(7).validate(7)
}).median(`119.00ns`)

bench("parse union", () => {
    type("string|number", { parse: { eager: true } })
}).median(`573.00ns`)

const smallUnion = type("string|number", { parse: { eager: true } })

bench("validate small union second", () => {
    smallUnion.validate(5)
}).median(`366.00ns`)

bench("validate small union first", () => {
    smallUnion.validate("")
}).median(`162.00ns`)

bench("parse large union eager", () => {
    type("1|2|3|4|5|6|7|8|9", { parse: { eager: true } })
}).median(`1.73us`)

bench("parse then validate large union", () => {
    type("1|2|3|4|5|6|7|8|9").validate(5)
}).median(`2.99us`)

bench("parse then validate large union first", () => {
    type("1|2|3|4|5|6|7|8|9").validate(1)
}).median(`2.18us`)

bench("parse then validate large union miss", () => {
    type("1|2|3|4|5|6|7|8|9").validate(10)
}).median(`8.34us`)

bench("errors at paths", () => {
    type({
        a: "string|number",
        b: "boolean?",
        c: { nested: ["undefined|null", "bigint"] }
    }).validate({ a: [], b: "hi", c: { nested: [true, 5] } })
}).median(`10.42us`)

bench("list type", () => {
    type("string[]").validate(["hi", "there", "we're", "strings", 5])
}).median(`6.46us`)

const recursive = space({ dejaVu: { dejaVu: "dejaVu?" } })
const dejaVu: typeof recursive.$meta.infer.dejaVu = {}
let i = 0
let current = dejaVu
while (i < 50) {
    current.dejaVu = { dejaVu: {} }
    current = current.dejaVu
    i++
}
bench("validate recursive", () => {
    recursive.dejaVu.validate(dejaVu)
}).median(`90.19us`)
