import { bench } from "@re-/assert"
import { space, type } from "../../src/index.js"

bench("validate undefined", () => {
    type("string?").validate(undefined)
}).median(`103.00ns`)

bench("validate string", () => {
    type("string?").validate("test")
}).median(`112.00ns`)

const deepStringDef = "string|".repeat(20).slice(0, -1)

bench("parse deeep", () => {
    type(deepStringDef as any)
}).median(`5.19us`)

bench("parse and validate deeep", () => {
    type(deepStringDef as any).validate("test")
}).median(`5.28us`)

bench("validate map", () => {
    type({ a: "string?", b: "number?", c: { nested: "boolean?" } }).validate({
        a: "okay",
        b: 5,
        c: { nested: true }
    })
}).median(`1.92us`)

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
}).median(`6.13us`)

bench("validate map bad", () => {
    type({ a: "string?", b: "number?", c: { nested: "boolean?" } }).validate({
        a: 5,
        b: 5,
        c: { nested: true }
    })
}).median(`1.89us`)

bench("validate tuple", () => {
    type(["string?", "number?", ["boolean?"]]).validate(["okay", 5, [true]])
}).median(`1.89us`)

bench("validate regex", () => {
    type(/.*/).validate("test")
}).median(`124.00ns`)

bench("parse union", () => {
    type("string|number")
}).median(`794.00ns`)

const smallUnion = type("string|number")

bench("validate small union second", () => {
    smallUnion.validate(5)
}).median(`103.00ns`)

bench("validate small union first", () => {
    smallUnion.validate("")
}).median(`81.00ns`)

bench("parse large union eager", () => {
    type("1|2|3|4|5|6|7|8|9")
}).median(`1.08us`)

bench("parse then validate large union", () => {
    type("1|2|3|4|5|6|7|8|9").validate(5)
}).median(`5.63us`)

bench("parse then validate large union first", () => {
    type("1|2|3|4|5|6|7|8|9").validate(1)
}).median(`5.60us`)

bench("parse then validate large union miss", () => {
    type("1|2|3|4|5|6|7|8|9").validate(10)
}).median(`5.68us`)

bench("errors at paths", () => {
    type({
        a: "string|number",
        b: "boolean?",
        c: { nested: ["undefined|null", "bigint"] }
    }).validate({ a: [], b: "hi", c: { nested: [true, 5] } })
}).median(`9.82us`)

bench("list type", () => {
    type("string[]").validate(["hi", "there", "we're", "strings", 5])
}).median(`666.00ns`)

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
}).median(`73.58us`)
