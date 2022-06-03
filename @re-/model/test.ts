import { bench } from "@re-/assert"
import { defaultParseContext } from "./src/nodes/node.js"
import { Root } from "./src/nodes/root.js"

console.log(Root.parse("string?", defaultParseContext).validate("test"))

bench("f parse", () => {
    Root.parse("string?", defaultParseContext).validate(undefined)
}).median("43.00ns")

bench("f parse", () => {
    Root.parse("string?", defaultParseContext).validate("test")
}).median("95.00ns")
