import { compileSerializedValue, In } from "../../compile/compile.js"
import type { Domain } from "../../utils/domains.js"
import { domainOf } from "../../utils/domains.js"
import { prototypeKeysOf } from "../../utils/objectKinds.js"
import { stringify } from "../../utils/serialize.js"
import type { Node } from "../node.js"
import { defineNodeKind } from "../node.js"
import type { BasisNode, defineBasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"

export type ValueNode = defineBasisNode<{
    kind: "value"
    rule: unknown
}>

export const ValueNode = defineNodeKind<ValueNode>({
    kind: "value",
    extend: (base) => ({
        domain: domainOf(base.rule),
        literalKeys:
            base.rule === null || base.rule === undefined
                ? []
                : [...prototypeKeysOf(base.rule), ...Object.keys(base.rule)]
    }),
    intersect: intersectBases,
    compile: (rule) => `${In} === ${compileSerializedValue(rule)}`,
    describe: (node) => `the value ${stringify(node.rule)}`
})

const z = ValueNode(5)

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("value", this.child))
// }

// getConstructor(): Constructor | undefined {
//     return this.domain === "object"
//         ? Object(this.child).constructor
//         : undefined
// }
