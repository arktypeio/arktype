import { bench } from "@re-/assert"
import { Root } from "../nodes/root.js"
import { Common } from "#common"
const defaultParseContext = Common.defaultParseContext

bench("validate undefined", () => {
    Root.parse("string?", defaultParseContext).validateByPath(undefined)
}).median("46.00ns")

bench("validate string", () => {
    Root.parse("string?", defaultParseContext).validateByPath("test")
}).median("128.00ns")

bench("parse deeep", () => {
    Root.parse(
        "string???????????????????????????????????????????",
        defaultParseContext
    )
}).median("53.00ns")

const eagerParseContext = { ...defaultParseContext, eager: true }

bench("parse deeep eager", () => {
    Root.parse(
        "string???????????????????????????????????????????",
        eagerParseContext
    )
}).median("1.11us")

bench("validate deeep", () => {
    Root.parse(
        "string???????????????????????????????????????????",
        defaultParseContext
    ).validateByPath("test")
}).median("1104.00ns")

const deepPreparsed = Root.parse(
    "string???????????????????????????????????????????",
    defaultParseContext
)

bench("validate deeep preparsed", () => {
    deepPreparsed.validateByPath("test")
}).median("219.00ns")

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

bench("validate tuple", () => {
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

bench("validate large union", () => {
    Root.parse("1|2|3|4|5|6|7|8|9", defaultParseContext).validateByPath(5)
}).median("3.61us")

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

bench("validate tuple", () => {
    Root.parse("string[]", defaultParseContext).validate([
        "hi",
        "there",
        "we're",
        "strings",
        5
    ])
}).median("2.46us")
