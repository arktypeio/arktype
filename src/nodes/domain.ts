import { hasKind, type Kind } from "../utils/domains.js"
import { throwInternalError } from "../utils/errors.js"
import type { constructor } from "../utils/generics.js"
import { constructorExtends } from "../utils/generics.js"
import { registry } from "../utils/registry.js"
import type { SerializablePrimitive } from "../utils/serialize.js"
import { serializePrimitive } from "../utils/serialize.js"
import type { ComparisonState, CompiledAssertion, Disjoint } from "./node.js"
import { Node } from "./node.js"

type DomainsByLevel = {
    kind: Exclude<Kind, "undefined" | "null" | "boolean">
    constructor: constructor
    value: [unknown]
}

export type Domain<level extends DomainLevel = DomainLevel> =
    DomainsByLevel[level]

export type DomainLevel = keyof DomainsByLevel

const levelOf = (domain: Domain) =>
    typeof domain === "string"
        ? "domain"
        : typeof domain === "object"
        ? "value"
        : "constructor"

const hasLevel = <type extends DomainLevel>(
    domain: Domain,
    type: type
): domain is Domain<type> => levelOf(domain) === type

export class DomainNode<level extends DomainLevel = DomainLevel> extends Node<
    typeof DomainNode
> {
    readonly kind = "domain"
    readonly level: level

    constructor(public rule: Domain<level>) {
        super(DomainNode, rule)
        this.level = levelOf(rule) as unknown as level
    }

    hasLevel<level extends DomainLevel>(
        level: level
    ): this is {
        level: level
        rule: Domain<level>
    } {
        return hasLevel(this.rule, level)
    }

    intersect(other: DomainNode, s: ComparisonState): DomainNode | Disjoint {
        if (this.hasLevel("kind")) {
            if (other.hasLevel("kind")) {
                return this === other
                    ? this
                    : s.addDisjoint("kind", this.rule, other.rule)
            }
            if (other.hasLevel("constructor")) {
                return this.rule === "object"
                    ? other
                    : s.addDisjoint("kind", this.rule as Kind, "object")
            }
        }
        if (this.hasLevel("constructor")) {
            if (other.hasLevel("kind")) {
                return other.rule === "object"
                    ? this
                    : s.addDisjoint("kind", "object", other.rule as Kind)
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

    static compile(base: Domain): CompiledAssertion {
        if (hasLevel(base, "kind")) {
            return base === "object"
                ? `((typeof data === "object" && data !== null) || typeof data === "function")`
                : `typeof data === "${base}"`
        } else if (hasLevel(base, "value")) {
            const value = base[0]
            return `data === ${
                hasKind(value, "object") || typeof value === "symbol"
                    ? registry().register(typeof value, value)
                    : serializePrimitive(value as SerializablePrimitive)
            }`
        } else {
            return `data instanceof ${
                base === Array ? "Array" : registry().register(base.name, base)
            }`
        }
    }
}
