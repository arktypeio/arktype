import { bench } from "@re-/assert"
import { Base } from "../nodes/base.js"
import { Root } from "../nodes/root.js"
const defaultParseContext = Base.defaultParseContext

bench("validate undefined", () => {
    Root.parse("string?", defaultParseContext).validateByPath(undefined)
}).median("46.00ns")

bench("valdiate string", () => {
    Root.parse("string?", defaultParseContext).validateByPath("test")
}).median("128.00ns")

bench("valdiate deeep", () => {
    Root.parse(
        "string???????????????????????????????????????????",
        defaultParseContext
    ).validateByPath("test")
}).median("950.00ns")

bench("validate map", () => {
    Root.parse(
        { a: "string?", b: "number?", c: { nested: "boolean?" } },
        defaultParseContext
    ).validateByPath({ a: "okay", b: 5, c: { nested: true } })
}).median("1.28us")

bench("validate map bad", () => {
    Root.parse(
        { a: "string?", b: "number?", c: { nested: "boolean?" } },
        defaultParseContext
    ).validateByPath({ a: 5, b: 5, c: { nested: true } })
}).median("1.43us")

bench("valdiate tuple", () => {
    Root.parse(
        ["string?", "number?", ["boolean?"]],
        defaultParseContext
    ).validateByPath(["okay", 5, [true]])
}).median("762.00ns")

bench("validate regex", () => {
    Root.parse(/.*/, defaultParseContext).validateByPath("test")
}).median("99.00ns")

bench("validate literal", () => {
    Root.parse(7, defaultParseContext).validateByPath(7)
}).median("84.00ns")

bench("validate union", () => {
    Root.parse("string|number", defaultParseContext).validateByPath(5)
}).median("571.00ns")

const unionCached = Root.parse("string|number", defaultParseContext)

bench("validate union cached", () => {
    unionCached.validateByPath(5)
}).median("268.00ns")

bench("errors at paths", () => {
    Root.parse(
        {
            a: "string|number",
            b: "boolean?",
            c: { nested: ["undefined|null", "bigint"] }
        },
        defaultParseContext
    ).validateByPath({ a: [], b: "hi", c: { nested: [true, 5] } })
}).median("4.27us")

bench("list type", () => {
    Root.parse("string[]", defaultParseContext).validateByPath([
        "hi",
        "there",
        "we're",
        "strings",
        5
    ])
}).median("1.49us")
