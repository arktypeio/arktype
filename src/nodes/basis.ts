import type { Domain, inferDomain } from "../utils/domains.js"
import { hasKind } from "../utils/domains.js"
import { throwInternalError } from "../utils/errors.js"
import type { constructor, evaluate } from "../utils/generics.js"
import { constructorExtends } from "../utils/generics.js"
import { registry } from "../utils/registry.js"
import type { SerializablePrimitive } from "../utils/serialize.js"
import { serializePrimitive } from "../utils/serialize.js"
import type { CompilationState, CompiledAssertion } from "./node.js"
import { DisjointNode, Node } from "./node.js"
import type { ProblemRules } from "./problems.js"

type BasesByLevel = {
    domain: Exclude<Domain, "undefined" | "null" | "boolean">
    class: constructor
    value: ["===", unknown]
}

export type Basis<level extends BasisLevel = BasisLevel> = BasesByLevel[level]

export type inferBasis<basis extends Basis> = basis extends Domain
    ? inferDomain<basis>
    : basis extends constructor<infer instance>
    ? instance
    : basis extends ["===", infer value]
    ? value
    : never

export type BasisLevel = evaluate<keyof BasesByLevel>

const levelOf = (basis: Basis): BasisLevel =>
    typeof basis === "string"
        ? "domain"
        : typeof basis === "object"
        ? "value"
        : "class"

const hasLevel = <level extends BasisLevel>(
    basis: Basis,
    level: level
): basis is Basis<level> => levelOf(basis) === level

export class BasisNode<level extends BasisLevel = BasisLevel> extends Node<
    typeof BasisNode
> {
    static readonly kind = "basis"
    readonly level: level

    constructor(public rule: Basis<level>) {
        super(BasisNode, rule)
        this.level = levelOf(rule) as unknown as level
    }

    hasLevel<level extends BasisLevel>(
        level: level
    ): this is {
        level: level
        rule: Basis<level>
    } {
        return hasLevel(this.rule, level)
    }

    static compare(l: BasisNode, r: BasisNode): BasisNode | DisjointNode {
        if (l.hasLevel("domain")) {
            if (r.hasLevel("domain")) {
                return l === r
                    ? l
                    : DisjointNode.from({ domain: { l: l.rule, r: r.rule } })
            }
            if (r.hasLevel("class")) {
                return l.rule === "object"
                    ? r
                    : DisjointNode.from({ domain: { l: l.rule, r: "object" } })
            }
        }
        if (l.hasLevel("class")) {
            if (r.hasLevel("domain")) {
                return r.rule === "object"
                    ? l
                    : DisjointNode.from({ domain: { l: "object", r: r.rule } })
            }
            if (r.hasLevel("class")) {
                return constructorExtends(l.rule, r.rule)
                    ? l
                    : constructorExtends(r.rule, l.rule)
                    ? r
                    : DisjointNode.from({ class: { l: l.rule, r: r.rule } })
            }
        }
        return throwInternalError(
            `Unexpected attempt to directly intersect base kinds ${l.kind} and ${r.kind}`
        )
    }

    static compile(rule: Basis): CompiledAssertion {
        if (hasLevel(rule, "domain")) {
            return rule === "object"
                ? `((typeof data === "object" && data !== null) || typeof data === "function")`
                : `typeof data === "${rule}"`
        } else if (hasLevel(rule, "value")) {
            const value = rule[1]
            return `data === ${
                hasKind(value, "object") || typeof value === "symbol"
                    ? registry().register(typeof value, value)
                    : serializePrimitive(value as SerializablePrimitive)
            }`
        } else {
            return `data instanceof ${
                rule === Array ? "Array" : registry().register(rule.name, rule)
            }`
        }
    }

    compileTraversal(s: CompilationState) {
        return s.ifNotThen(
            this.key,
            s.problem(
                this.level,
                this.rule as ProblemRules[(typeof this)["level"]]
            )
        )
    }
}
