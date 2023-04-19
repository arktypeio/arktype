import { type Domain, hasDomain } from "../utils/domains.js"
import { throwInternalError } from "../utils/errors.js"
import type { constructor } from "../utils/generics.js"
import { constructorExtends } from "../utils/generics.js"
import { registry } from "../utils/registry.js"
import type { SerializablePrimitive } from "../utils/serialize.js"
import { serializePrimitive } from "../utils/serialize.js"
import type { ComparisonState, CompiledAssertion, Disjoint } from "./node.js"
import { Node } from "./node.js"

type BaseConstraintKinds = {
    domain: Exclude<Domain, "undefined" | "null" | "boolean">
    constructor: constructor
    value: { value: unknown }
}

export type BaseConstraint<baseKind extends BaseKind = BaseKind> =
    BaseConstraintKinds[baseKind]

export type BaseKind = keyof BaseConstraintKinds

const baseKindOf = (base: BaseConstraint) =>
    typeof base === "string"
        ? "domain"
        : typeof base === "object"
        ? "value"
        : "constructor"

const hasBaseKind = <kind extends BaseKind>(
    base: BaseConstraint,
    kind: kind
): base is BaseConstraint<kind> => baseKindOf(base) === kind

export class BaseNode<baseKind extends BaseKind = BaseKind> extends Node<
    typeof BaseNode
> {
    readonly kind = "base"
    readonly baseKind: baseKind

    constructor(public base: BaseConstraint<baseKind>) {
        super(BaseNode, base)
        this.baseKind = baseKindOf(base) as unknown as baseKind
    }

    hasBaseKind<kind extends BaseKind>(
        kind: kind
    ): this is { base: BaseConstraint<kind> } {
        return hasBaseKind(this.base, kind)
    }

    intersect(other: BaseNode, s: ComparisonState): BaseNode | Disjoint {
        if (this.hasBaseKind("domain")) {
            if (other.hasBaseKind("domain")) {
                return this === other
                    ? this
                    : s.addDisjoint("domain", this.base, other.base)
            }
            if (other.hasBaseKind("constructor")) {
                return this.base === "object"
                    ? other
                    : s.addDisjoint("domain", this.base as Domain, "object")
            }
        }
        if (this.hasBaseKind("constructor")) {
            if (other.hasBaseKind("domain")) {
                return other.base === "object"
                    ? this
                    : s.addDisjoint("domain", "object", other.base as Domain)
            }
            if (other.hasBaseKind("constructor")) {
                return constructorExtends(this.base, other.base)
                    ? this
                    : constructorExtends(other.base, this.base)
                    ? other
                    : s.addDisjoint("class", this.base, other.base)
            }
        }
        return throwInternalError(
            `Unexpected attempt to directly intersect base kinds ${this.kind} and ${other.kind}`
        )
    }

    static compile(base: BaseConstraint): CompiledAssertion {
        if (hasBaseKind(base, "domain")) {
            return base === "object"
                ? `((typeof data === "object" && data !== null) || typeof data === "function")`
                : `typeof data === "${base}"`
        } else if (hasBaseKind(base, "value")) {
            return `data === ${
                hasDomain(base.value, "object") ||
                typeof base.value === "symbol"
                    ? registry().register(typeof base.value, base.value)
                    : serializePrimitive(base.value as SerializablePrimitive)
            }`
        } else {
            return `data instanceof ${
                base === Array ? "Array" : registry().register(base.name, base)
            }`
        }
    }
}
