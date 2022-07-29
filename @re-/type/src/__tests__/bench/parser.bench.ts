import { bench } from "@re-/assert"
import { space, type } from "../../index.js"

bench("validate undefined", () => {
    type("string?").validate(undefined)
}).median(`109.00ns`)

bench("validate string", () => {
    type("string?").validate("test")
}).median(`116.00ns`)

const deepStringDef = "string|".repeat(20).slice(0, -1)

bench("parse deeep", () => {
    type(deepStringDef as any)
}).median(`5.23us`)

bench("parse and validate deeep", () => {
    type(deepStringDef as any).validate("test")
}).median(`5.30us`)

bench("validate map", () => {
    type({ a: "string?", b: "number?", c: { nested: "boolean?" } }).validate({
        a: "okay",
        b: 5,
        c: { nested: true }
    })
}).median(`1.97us`)

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
}).median(`6.26us`)

bench("validate map bad", () => {
    type({ a: "string?", b: "number?", c: { nested: "boolean?" } }).validate({
        a: 5,
        b: 5,
        c: { nested: true }
    })
}).median(`6.33us`)

bench("validate tuple", () => {
    type(["string?", "number?", ["boolean?"]]).validate(["okay", 5, [true]])
}).median(`1.97us`)

bench("validate regex", () => {
    type(/.*/).validate("test")
}).median(`123.00ns`)

bench("parse union", () => {
    type("string|number")
}).median(`849.00ns`)

const smallUnion = type("string|number")

bench("validate small union second", () => {
    smallUnion.validate(5)
}).median(`187.00ns`)

bench("validate small union first", () => {
    smallUnion.validate("")
}).median(`105.00ns`)

bench("parse large union eager", () => {
    type("1|2|3|4|5|6|7|8|9")
}).median(`1.23us`)

bench("parse then validate large union", () => {
    type("1|2|3|4|5|6|7|8|9").validate(5)
}).median(`6.46us`)

bench("parse then validate large union first", () => {
    type("1|2|3|4|5|6|7|8|9").validate(1)
}).median(`6.45us`)

bench("parse then validate large union miss", () => {
    type("1|2|3|4|5|6|7|8|9").validate(10)
}).median(`6.57us`)

bench("errors at paths", () => {
    type({
        a: "string|number",
        b: "boolean?",
        c: { nested: ["undefined|null", "bigint"] }
    }).validate({ a: [], b: "hi", c: { nested: [true, 5] } })
}).median(`11.04us`)

bench("list type", () => {
    type("string[]").validate(["hi", "there", "we're", "strings", 5])
}).median(`5.60us`)

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
}).median(`72.27us`)
