import { bench } from "@re-/assert"
import { defaultParseContext } from "./src/nodes/node.js"
import { Root } from "./src/nodes/root.js"

bench("validate undefined", () => {
    Root.Node.parse("string?", defaultParseContext).validate(undefined)
}).median("42.00ns")

bench("valdiate string", () => {
    Root.Node.parse("string?", defaultParseContext).validate("test")
}).median("98.00ns")
