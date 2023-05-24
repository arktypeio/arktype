import { domainOf } from "../../utils/domains.js"
import { prototypeKeysOf } from "../../utils/objectKinds.js"
import type { Key } from "../../utils/records.js"
import { stringify } from "../../utils/serialize.js"
import { compileSerializedValue, In } from "../compilation.js"
import { defineNode } from "../node.js"
import { BasisNode } from "./basis.js"

export type ValueNode = ReturnType<typeof ValueNode>

export const ValueNode = defineNode(
    class ValueNode extends BasisNode<"value", unknown> {
        readonly kind = "basis"
        readonly level = "value"

        static compile(rule: unknown) {
            return [`${In} === ${compileSerializedValue(rule)}`]
        }

        get domain() {
            return domainOf(this.rule)
        }

        literalKeysOf(): Key[] {
            if (this.rule === null || this.rule === undefined) {
                return []
            }
            return [...prototypeKeysOf(this.rule), ...Object.keys(this.rule)]
        }

        describe() {
            return stringify(this.rule)
        }
    }
)

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("value", this.child))
// }

// getConstructor(): Constructor | undefined {
//     return this.domain === "object"
//         ? Object(this.child).constructor
//         : undefined
// }
