import { bench } from "@re-/assert"
import { defaultParseContext } from "./src/nodes/node.js"
import { Root } from "./src/nodes/root.js"

bench("validate undefined", () => {
    Root.Node.parse("string?", defaultParseContext).validate(undefined)
}).median("46.00ns")

bench("valdiate string", () => {
    Root.Node.parse("string?", defaultParseContext).validate("test")
}).median("128.00ns")

bench("validate map", () => {
    Root.Node.parse(
        { a: "string?", b: "number?", c: { nested: "boolean?" } },
        defaultParseContext
    ).validate({ a: "okay", b: 5, c: { nested: true } })
}).median("1.11us")

bench("validate map bad", () => {
    Root.Node.parse(
        { a: "string?", b: "number?", c: { nested: "boolean?" } },
        defaultParseContext
    ).validate({ a: 5, b: 5, c: { nested: true } })
}).median("782.00ns")

bench("valdiate tuple", () => {
    Root.Node.parse(
        ["string?", "number?", ["boolean?"]],
        defaultParseContext
    ).validate(["okay", 5, [true]])
}).median("762.00ns")

bench("validate regex", () => {
    Root.Node.parse(/.*/, defaultParseContext).validate("test")
}).median("99.00ns")
