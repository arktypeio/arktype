import { writeUnboundableMessage } from "../../parse/ast/bound.js"
import { writeIndivisibleMessage } from "../../parse/ast/divisor.js"
import type { Domain, inferDomain } from "../../utils/domains.js"
import { throwInternalError, throwParseError } from "../../utils/errors.js"
import type { evaluate } from "../../utils/generics.js"
import type {
    AbstractableConstructor,
    Constructor
} from "../../utils/objectKinds.js"
import { constructorExtends } from "../../utils/objectKinds.js"
import type { Key } from "../../utils/records.js"
import { stringify } from "../../utils/serialize.js"
import type { DisjointKindEntries } from "../disjoint.js"
import { Disjoint } from "../disjoint.js"
import { BaseNode } from "../node.js"
import { type ConstraintKind } from "../predicate.js"
import type { ClassNode } from "./class.js"
import type { DomainNode } from "./domain.js"
import type { ValueNode } from "./value.js"

type BasisNodesByLevel = {
    domain: DomainNode
    class: ClassNode
    value: ValueNode
}

type BasisInputs = {
    domain: Domain
    value: readonly ["===", unknown]
    class: AbstractableConstructor
}

export type BasisInput<level extends BasisLevel = BasisLevel> =
    BasisInputs[level]

export type inferBasis<basis extends BasisInput> = basis extends Domain
    ? inferDomain<basis>
    : basis extends Constructor<infer instance>
    ? instance
    : basis extends readonly ["===", infer value]
    ? value
    : never

export type BasisLevel = evaluate<keyof BasisNodesByLevel>

export const precedenceByLevel: Record<BasisLevel, number> = {
    value: 0,
    class: 1,
    domain: 2
}

export type BasisNodeSubclass = BasisNodesByLevel[BasisLevel]

export abstract class BasisNode<
    level extends BasisLevel = BasisLevel,
    rule = unknown
> extends BaseNode<rule> {
    abstract literalKeysOf(): Key[]
    abstract domain: Domain
    abstract level: level

    keyof() {
        // TODO: caching
        // TypeNode.fromValue(...this.literalKeysOf())
        return {} as never
    }

    hasLevel<level extends BasisLevel>(
        level: level
    ): this is BasisNodesByLevel[level] {
        return this.level === (level as unknown)
    }

    computeIntersection(other: this): rule | Disjoint
    computeIntersection(this: BasisNode & this, other: BasisNode & this) {
        if (this === other) {
            return this.rule
        }
        if (this.hasLevel("class") && other.hasLevel("class")) {
            return constructorExtends(this.rule, other.rule)
                ? this.rule
                : constructorExtends(other.rule, this.rule)
                ? other.rule
                : Disjoint.from("class", this, other)
        }
        const disjointEntries: DisjointKindEntries = []
        if (this.domain !== other.domain) {
            disjointEntries.push(["domain", { l: this, r: other }])
        }
        if (this.hasLevel("value") && other.hasLevel("value")) {
            if (this !== other) {
                disjointEntries.push(["value", { l: this, r: other }])
            }
        }
        return disjointEntries.length
            ? Disjoint.fromEntries(disjointEntries)
            : precedenceByLevel[this.level] < precedenceByLevel[other.level]
            ? this.rule
            : precedenceByLevel[other.level] < precedenceByLevel[this.level]
            ? other.rule
            : throwInternalError(
                  `Unexpected non-disjoint intersection from basis nodes with equal precedence ${this} and ${other}`
              )
    }

    assertAllowsConstraint(kind: ConstraintKind) {
        if (this.hasLevel("value")) {
            if (kind !== "morph") {
                throwInvalidConstraintError(
                    kind,
                    "a non-literal type",
                    stringify(this.rule)
                )
            }
            return
        }
        switch (kind) {
            case "divisor":
                if (this.domain !== "number") {
                    throwParseError(writeIndivisibleMessage(this.domain))
                }
                return
            case "range":
                if (
                    this.domain !== "string" &&
                    this.domain !== "number"
                    // !this.hasConstructorExtending(Array, Date)
                ) {
                    throwParseError(writeUnboundableMessage(this.domain))
                }
                return
            case "regex":
                if (this.domain !== "string") {
                    throwInvalidConstraintError(
                        "regex",
                        "a string",
                        this.domain
                    )
                }
                return
            case "props":
                if (this.domain !== "object") {
                    throwInvalidConstraintError(
                        "props",
                        "an object",
                        this.domain
                    )
                }
                return
            case "narrow":
                return
            case "morph":
                return
            default:
                throwInternalError(`Unexpxected rule kind '${kind}'`)
        }
    }
}

export const writeInvalidConstraintMessage = (
    kind: ConstraintKind,
    typeMustBe: string,
    typeWas: string
) => {
    return `${kind} constraint may only be applied to ${typeMustBe} (was ${typeWas})`
}

export const throwInvalidConstraintError = (
    ...args: Parameters<typeof writeInvalidConstraintMessage>
) => throwParseError(writeInvalidConstraintMessage(...args))
