import { compileSerializedValue, In } from "../../compile/compile.js"
import { domainOf } from "../../utils/domains.js"
import { stringify } from "../../utils/serialize.js"
import type { BasisNode } from "./basis.js"
import { defineBasisNode } from "./basis.js"

export type ValueNode = BasisNode<{
    rule: unknown
    level: "value"
}>

export const ValueNode = defineBasisNode<ValueNode>({
    level: "value",
    domain: domainOf,
    compile: (rule) => `${In} === ${compileSerializedValue(rule)}`,
    describe: (node) => `the value ${stringify(node.rule)}`
})

// literalKeysOf(): PropertyKey[] {
//     if (this.rule === null || this.rule === undefined) {
//         return []
//     }
//     return [...prototypeKeysOf(this.rule), ...Object.keys(this.rule)]
// }

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("value", this.child))
// }

// getConstructor(): Constructor | undefined {
//     return this.domain === "object"
//         ? Object(this.child).constructor
//         : undefined
// }
