import { domainOf } from "../../utils/domains.js"
import { prototypeKeysOf } from "../../utils/objectKinds.js"
import type { Key } from "../../utils/records.js"
import { stringify } from "../../utils/serialize.js"
import { compileSerializedValue, In } from "../compilation.js"
import { BaseNode } from "../node.js"
import type { BasisDefinition, BasisInstance } from "./basis.js"
import { intersectBases } from "./basis.js"

export class ValueNode
    extends BaseNode<typeof ValueNode>
    implements BasisDefinition
{
    static readonly kind = "basis"

    get level() {
        return "value" as const
    }

    get domain() {
        return domainOf(this.rule)
    }

    static compile(rule: unknown) {
        return [`${In} === ${compileSerializedValue(rule)}`]
    }

    computeIntersection(other: BasisInstance) {
        return intersectBases(this, other)
    }

    literalKeysOf(): Key[] {
        if (this.rule === null || this.rule === undefined) {
            return []
        }
        return [...prototypeKeysOf(this.rule), ...Object.keys(this.rule)]
    }

    toString() {
        return stringify(this.rule)
    }
}

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("value", this.child))
// }

// getConstructor(): Constructor | undefined {
//     return this.domain === "object"
//         ? Object(this.child).constructor
//         : undefined
// }
