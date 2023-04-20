import { type Domain, hasKind } from "../utils/domains.js"
import { throwInternalError } from "../utils/errors.js"
import type { constructor } from "../utils/generics.js"
import { constructorExtends } from "../utils/generics.js"
import { registry } from "../utils/registry.js"
import type { SerializablePrimitive } from "../utils/serialize.js"
import { serializePrimitive } from "../utils/serialize.js"
import type { ComparisonState, CompiledAssertion, Disjoint } from "./node.js"
import { Node } from "./node.js"

type BasesByLevel = {
    kind: Exclude<Domain, "undefined" | "null" | "boolean">
    constructor: constructor
    value: ["===", unknown]
}

export type Basis<level extends BasisLevel = BasisLevel> = BasesByLevel[level]

export type BasisLevel = keyof BasesByLevel

const levelOf = (basis: Basis): BasisLevel =>
    typeof basis === "string"
        ? "kind"
        : typeof basis === "object"
        ? "value"
        : "constructor"

const hasLevel = <level extends BasisLevel>(
    basis: Basis,
    level: level
): basis is Basis<level> => levelOf(basis) === level

export class BasisNode<level extends BasisLevel = BasisLevel> extends Node<
    typeof BasisNode
> {
    readonly kind = "basis"
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

    intersect(other: BasisNode, s: ComparisonState): BasisNode | Disjoint {
        if (this.hasLevel("kind")) {
            if (other.hasLevel("kind")) {
                return this === other
                    ? this
                    : s.addDisjoint("kind", this.rule, other.rule)
            }
            if (other.hasLevel("constructor")) {
                return this.rule === "object"
                    ? other
                    : s.addDisjoint("kind", this.rule as Domain, "object")
            }
        }
        if (this.hasLevel("constructor")) {
            if (other.hasLevel("kind")) {
                return other.rule === "object"
                    ? this
                    : s.addDisjoint("kind", "object", other.rule as Domain)
            }
            if (other.hasLevel("constructor")) {
                return constructorExtends(this.rule, other.rule)
                    ? this
                    : constructorExtends(other.rule, this.rule)
                    ? other
                    : s.addDisjoint("class", this.rule, other.rule)
            }
        }
        return throwInternalError(
            `Unexpected attempt to directly intersect base kinds ${this.kind} and ${other.kind}`
        )
    }

    static compile(rule: Basis): CompiledAssertion {
        if (hasLevel(rule, "kind")) {
            return rule === "object"
                ? `((typeof data === "object" && data !== null) || typeof data === "function")`
                : `typeof data === "${rule}"`
        } else if (hasLevel(rule, "value")) {
            const value = rule[0]
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
}
