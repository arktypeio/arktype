import { compileSerializedValue, In } from "../../compile/compilation.js"
import { domainOf } from "../../utils/domains.js"
import { prototypeKeysOf } from "../../utils/objectKinds.js"
import { stringify } from "../../utils/serialize.js"
import { BaseNode } from "../node.js"
import type { BasisDefinition, BasisInstance } from "./basis.js"
import { intersectBases } from "./basis.js"

export class ValueNode extends BaseNode<"basis"> implements BasisDefinition {
    readonly level = "value"

    constructor(public rule: unknown) {
        const condition = `${In} === ${compileSerializedValue(rule)}`
        if (BaseNode.nodes.basis[condition]) {
            return BaseNode.nodes.basis[condition] as ValueNode
        }
        super("basis", condition)
    }

    readonly domain = domainOf(this.rule)

    computeIntersection(other: BasisInstance) {
        return intersectBases(this, other)
    }

    literalKeysOf(): PropertyKey[] {
        if (this.rule === null || this.rule === undefined) {
            return []
        }
        return [...prototypeKeysOf(this.rule), ...Object.keys(this.rule)]
    }

    toString() {
        return `the value ${stringify(this.rule)}`
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
