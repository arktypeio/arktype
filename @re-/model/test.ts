import { bench } from "@re-/assert"
import { defaultParseContext, parse } from "./src/nodes/node.js"
import { Root } from "./src/nodes/root.js"

console.log(
    parse({
        def: "string?",
        ctx: defaultParseContext,
        node: Root.node
    }).validate(undefined)
)

console.log(Root.parse("string?", defaultParseContext).validate(undefined))

bench("node parse", () => {
    parse({
        def: "string?",
        ctx: defaultParseContext,
        node: Root.node
    }).validate(undefined)
}).median("185.00ns")

bench("f parse", () => {
    Root.parse("string?", defaultParseContext).validate(undefined)
}).median("98.00ns")
