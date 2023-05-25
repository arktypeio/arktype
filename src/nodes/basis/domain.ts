import type { Domain } from "../../utils/domains.js"
import { getBaseDomainKeys } from "../../utils/objectKinds.js"
import type { Key } from "../../utils/records.js"
import { In } from "../compilation.js"
import { BaseNode } from "../node.js"
import type { ConstraintKind } from "../predicate.js"
import type { BasisDefinition, BasisInstance } from "./basis.js"
import { assertAllowsConstraint, intersectBases } from "./basis.js"

export class DomainNode
    extends BaseNode<typeof DomainNode>
    implements BasisDefinition
{
    static readonly kind = "basis"
    readonly level = "domain"

    domain = this.rule

    static compile(domain: Domain) {
        return [
            domain === "object"
                ? `((typeof ${In} === "object" && ${In} !== null) || typeof ${In} === "function")`
                : `typeof ${In} === "${domain}"`
        ]
    }

    computeIntersection(other: BasisInstance) {
        return intersectBases(this, other)
    }

    assertAllowsConstraint(kind: ConstraintKind) {
        assertAllowsConstraint(this, kind)
    }

    literalKeysOf(): Key[] {
        return getBaseDomainKeys(this.rule)
    }

    describe() {
        return this.domain
    }
}

// compileTraverse(s: CompilationState) {
//     return s.ifNotThen(this.condition, s.problem("domain", this.child))
// }
