import { type Domain, hasDomain } from "../utils/domains.js"
import { throwInternalError } from "../utils/errors.js"
import type { constructor } from "../utils/generics.js"
import { registry } from "../utils/registry.js"
import type { SerializablePrimitive } from "../utils/serialize.js"
import { serializePrimitive } from "../utils/serialize.js"
import type { ComparisonState, CompiledAssertion } from "./node.js"
import { Node } from "./node.js"

export type BaseConstraint<
    kind extends BaseConstraintKind = BaseConstraintKind
> = {
    readonly kind: kind
    readonly value: BaseConstraintValuesByKind[kind]
}

type BaseConstraintValuesByKind = {
    value: unknown
    domain: Exclude<Domain, "undefined" | "null" | "boolean">
    instance: constructor
}

export type BaseConstraintKind = keyof BaseConstraintValuesByKind

export class BaseNode<
    base extends BaseConstraint = BaseConstraint
> extends Node<typeof BaseNode> {
    readonly kind = "base"

    constructor(public base: base) {
        super(BaseNode, base)
    }

    // intersect(
    //     other: InstanceNode,
    //     s: ComparisonState
    // ): InstanceNode | Disjoint {
    //     return constructorExtends(this.ancestor, other.ancestor)
    //         ? this
    //         : constructorExtends(other.ancestor, this.ancestor)
    //         ? other
    //         : s.addDisjoint("class", this, other)
    // }

    // intersect(other: EqualityNode, s: ComparisonState) {
    //     return this === other ? this : s.addDisjoint("value", this, other)
    // }

    intersect(other: BaseNode, s: ComparisonState) {
        return this.base === other.base
            ? this
            : s.addDisjoint("domain", this, other)
    }

    static compile<base extends BaseConstraint>(base: base): CompiledAssertion {
        switch (base.kind) {
            case "domain":
                const domain = base.value as Domain
                return domain === "object"
                    ? `((typeof data === "object" && data !== null) || typeof data === "function")`
                    : `typeof data === "${domain}"`
            case "value":
                return `data === ${
                    hasDomain(base.value, "object") ||
                    typeof base.value === "symbol"
                        ? registry().register(typeof base.value, base.value)
                        : serializePrimitive(
                              base.value as SerializablePrimitive
                          )
                }`
            case "instance":
                const ancestor = base.value as constructor
                // TODO: also for other builtins
                return `data instanceof ${
                    ancestor === Array
                        ? "Array"
                        : registry().register(ancestor.name, ancestor)
                }`
            default:
                return throwInternalError(
                    `Unexpected base constraint kind '${base.kind}'`
                )
        }
    }
}
