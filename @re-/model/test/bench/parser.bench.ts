import { bench } from "@re-/assert"
import { model, space } from "../../src/index.js"

bench("validate undefined", () => {
    model("string?").validate(undefined)
}).median(`68.00ns`)

bench("validate string", () => {
    model("string?").validate("test")
}).median(`125.00ns`)

const deepStringDef = "string|".repeat(20).slice(0, -1)

bench("parse deeep", () => {
    model(deepStringDef as any)
}).median(`206.00ns`)

bench("parse deeep eager", () => {
    model(deepStringDef as any, { parse: { eager: true } })
}).median(`2.31us`)

bench("parse and validate deeep", () => {
    model(deepStringDef as any).validate("test")
}).median(`2.54us`)

const deepPreparsed = model(deepStringDef as any)

bench("validate deeep preparsed", () => {
    deepPreparsed.validate("test")
}).median(`138.00ns`)

bench("validate map", () => {
    model({ a: "string?", b: "number?", c: { nested: "boolean?" } }).validate({
        a: "okay",
        b: 5,
        c: { nested: true }
    })
}).median(`1.87us`)

bench("validate map extraneous", () => {
    model({ a: "string?", b: "number?", c: { nested: "boolean?" } }).validate({
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
    model({ a: "string?", b: "number?", c: { nested: "boolean?" } }).validate({
        a: 5,
        b: 5,
        c: { nested: true }
    })
}).median(`6.25us`)

bench("validate tuple", () => {
    model(["string?", "number?", ["boolean?"]]).validate(["okay", 5, [true]])
}).median(`1.50us`)

bench("validate regex", () => {
    model(/.*/).validate("test")
}).median(`135.00ns`)

bench("validate literal", () => {
    model(7).validate(7)
}).median(`119.00ns`)

bench("parse union", () => {
    model("string|number", { parse: { eager: true } })
}).median(`573.00ns`)

const smallUnion = model("string|number", { parse: { eager: true } })

bench("validate small union second", () => {
    smallUnion.validate(5)
}).median(`366.00ns`)

bench("validate small union first", () => {
    smallUnion.validate("")
}).median(`162.00ns`)

bench("parse large union eager", () => {
    model("1|2|3|4|5|6|7|8|9", { parse: { eager: true } })
}).median(`1.73us`)

bench("parse then validate large union", () => {
    model("1|2|3|4|5|6|7|8|9").validate(5)
}).median(`2.99us`)

bench("parse then validate large union first", () => {
    model("1|2|3|4|5|6|7|8|9").validate(1)
}).median(`2.18us`)

bench("parse then validate large union miss", () => {
    model("1|2|3|4|5|6|7|8|9").validate(10)
}).median(`8.34us`)

bench("errors at paths", () => {
    model({
        a: "string|number",
        b: "boolean?",
        c: { nested: ["undefined|null", "bigint"] }
    }).validate({ a: [], b: "hi", c: { nested: [true, 5] } })
}).median(`10.42us`)

bench("list type", () => {
    model("string[]").validate(["hi", "there", "we're", "strings", 5])
}).median(`6.46us`)

const recursive = space({ dejaVu: { dejaVu: "dejaVu?" } })
const dejaVu: typeof recursive.$meta.types.dejaVu = {}
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
