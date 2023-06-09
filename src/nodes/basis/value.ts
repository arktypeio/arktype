import { compileSerializedValue, In } from "../../compile/compile.js"
import { domainOf } from "../../utils/domains.js"
import { prototypeKeysOf } from "../../utils/objectKinds.js"
import { stringify } from "../../utils/serialize.js"
import { defineNodeKind } from "../node.js"
import type { BasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"

export type ValueNode = BasisNode<{ kind: "value"; rule: unknown }>

export const ValueNode = defineNodeKind<ValueNode>({
    kind: "value",
    props: (base) => ({
        domain: domainOf(base.rule),
        literalKeys:
            base.rule === null || base.rule === undefined
                ? []
                : [...prototypeKeysOf(base.rule), ...Object.keys(base.rule)],
        description: `the value ${stringify(base.rule)}`
    }),
    intersect: intersectBases,
    compile: (rule) => `${In} === ${compileSerializedValue(rule)}`
})

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("value", this.child))
// }

// getConstructor(): Constructor | undefined {
//     return this.domain === "object"
//         ? Object(this.child).constructor
//         : undefined
// }
