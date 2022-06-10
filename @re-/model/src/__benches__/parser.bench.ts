import { bench } from "@re-/assert"
import { Root } from "../nodes/root.js"
import { Common } from "#common"
const defaultParseContext = Common.defaultParseContext

bench("validate undefined", () => {
    Root.parse("string?", defaultParseContext).validateByPath(undefined)
}).median("45.00ns")

bench("validate string", () => {
    Root.parse("string?", defaultParseContext).validateByPath("test")
}).median("104.00ns")

bench("parse deeep", () => {
    Root.parse(
        "string???????????????????????????????????????????",
        defaultParseContext
    )
}).median("52.00ns")

const eagerParseContext = { ...defaultParseContext, eager: true }

bench("parse deeep eager", () => {
    Root.parse(
        "string???????????????????????????????????????????",
        eagerParseContext
    )
}).median("1.03us")

bench("validate deeep", () => {
    Root.parse(
        "string???????????????????????????????????????????",
        defaultParseContext
    ).validateByPath("test")
}).median("1.18us")

const deepPreparsed = Root.parse(
    "string???????????????????????????????????????????",
    defaultParseContext
)

bench("validate deeep preparsed", () => {
    deepPreparsed.validateByPath("test")
}).median("230.00ns")

bench("validate map", () => {
    Root.parse(
        { a: "string?", b: "number?", c: { nested: "boolean?" } },
        defaultParseContext
    ).validateByPath({ a: "okay", b: 5, c: { nested: true } })
}).median("1.24us")

bench("validate map bad", () => {
    Root.parse(
        { a: "string?", b: "number?", c: { nested: "boolean?" } },
        defaultParseContext
    ).validateByPath({ a: 5, b: 5, c: { nested: true } })
}).median("1.55us")

bench("validate tuple", () => {
    Root.parse(
        ["string?", "number?", ["boolean?"]],
        defaultParseContext
    ).validateByPath(["okay", 5, [true]])
}).median("789.00ns")

bench("validate regex", () => {
    Root.parse(/.*/, defaultParseContext).validateByPath("test")
}).median("95.00ns")

bench("validate literal", () => {
    Root.parse(7, defaultParseContext).validateByPath(7)
}).median("76.00ns")

bench("parse union", () => {
    Root.parse("string|number", eagerParseContext)
}).median("544.00ns")

const smallUnion = Root.parse("string|number", eagerParseContext)

bench("validate small union second", () => {
    smallUnion.validateByPath(5)
}).median("175.00ns")

bench("validate small union first", () => {
    smallUnion.validateByPath("")
}).median("60.00ns")

bench("parse large union eager", () => {
    Root.parse("1|2|3|4|5|6|7|8|9", eagerParseContext)
}).median("1.76us")

bench("parse then validate large union", () => {
    Root.parse("1|2|3|4|5|6|7|8|9", defaultParseContext).validateByPath(5)
}).median("2.24us")

bench("parse then validate large union first", () => {
    Root.parse("1|2|3|4|5|6|7|8|9", defaultParseContext).validateByPath(1)
}).median("1.68us")

bench("parse then validate large union miss", () => {
    Root.parse("1|2|3|4|5|6|7|8|9", defaultParseContext).validateByPath(10)
}).median("2.99us")

bench("errors at paths", () => {
    Root.parse(
        {
            a: "string|number",
            b: "boolean?",
            c: { nested: ["undefined|null", "bigint"] }
        },
        defaultParseContext
    ).validateByPath({ a: [], b: "hi", c: { nested: [true, 5] } })
}).median("4.38us")

bench("list type", () => {
    Root.parse("string[]", defaultParseContext).validateByPath([
        "hi",
        "there",
        "we're",
        "strings",
        5
    ])
}).median("1.59us")

bench("validate tuple", () => {
    Root.parse("string[]", defaultParseContext).validate([
        "hi",
        "there",
        "we're",
        "strings",
        5
    ])
}).median("2.03us")
