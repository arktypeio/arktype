import { bench } from "@re-/assert"
import { toString } from "@re-/tools"
import { Base } from "../nodes/base.js"
import { Root } from "../nodes/root.js"
const defaultParseContext = Base.defaultParseContext

bench("validate undefined", () => {
    Root.parse("string?", defaultParseContext).validate(undefined, {})
}).median("46.00ns")

bench("valdiate string", () => {
    Root.parse("string?", defaultParseContext).validate("test", {})
}).median("128.00ns")

bench("valdiate deeep", () => {
    Root.parse(
        "string???????????????????????????????????????????",
        defaultParseContext
    ).validate("test", {})
}).median("950.00ns")

bench("validate map", () => {
    Root.parse(
        { a: "string?", b: "number?", c: { nested: "boolean?" } },
        defaultParseContext
    ).validate({ a: "okay", b: 5, c: { nested: true } }, {})
}).median("1.28us")

bench("validate map bad", () => {
    Root.parse(
        { a: "string?", b: "number?", c: { nested: "boolean?" } },
        defaultParseContext
    ).validate({ a: 5, b: 5, c: { nested: true } }, {})
}).median("1.43us")

bench("valdiate tuple", () => {
    Root.parse(
        ["string?", "number?", ["boolean?"]],
        defaultParseContext
    ).validate(["okay", 5, [true]], {})
}).median("762.00ns")

bench("validate regex", () => {
    Root.parse(/.*/, defaultParseContext).validate("test", {})
}).median("99.00ns")

bench("validate literal", () => {
    Root.parse(7, defaultParseContext).validate(7, {})
}).median("84.00ns")
