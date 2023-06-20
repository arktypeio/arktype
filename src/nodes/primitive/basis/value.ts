import { domainOf } from "../../../../dev/utils/src/domains.js"
import { prototypeKeysOf } from "../../../../dev/utils/src/objectKinds.js"
import { stringify } from "../../../../dev/utils/src/serialize.js"
import { compileSerializedValue, In } from "../../../compile/compile.js"
import { defineNodeKind } from "../../node.js"
import type { BasisNode } from "./basis.js"
import { intersectBases } from "./basis.js"

export interface ValueNode extends BasisNode<unknown> {}

export const valueNode = defineNodeKind<ValueNode>(
    {
        kind: "value",
        parse: (input) => input,
        intersect: intersectBases,
        compile: (rule) => [`${In} === ${compileSerializedValue(rule)}`]
    },
    (base) => ({
        domain: domainOf(base.rule),
        literalKeys:
            base.rule === null || base.rule === undefined
                ? []
                : [...prototypeKeysOf(base.rule), ...Object.keys(base.rule)],
        description: `the value ${stringify(base.rule)}`
    })
)

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("value", this.child))
// }

// getConstructor(): Constructor | undefined {
//     return this.domain === "object"
//         ? Object(this.child).constructor
//         : undefined
// }
