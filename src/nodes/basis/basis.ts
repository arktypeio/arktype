import { writeUnboundableMessage } from "../../parse/ast/bound.js"
import { writeIndivisibleMessage } from "../../parse/ast/divisor.js"
import type { Domain, inferDomain } from "../../utils/domains.js"
import { throwInternalError, throwParseError } from "../../utils/errors.js"
import type { evaluate } from "../../utils/generics.js"
import type {
    AbstractableConstructor,
    Constructor,
    instanceOf
} from "../../utils/objectKinds.js"
import { constructorExtends } from "../../utils/objectKinds.js"
import type { Key } from "../../utils/records.js"
import { stringify } from "../../utils/serialize.js"
import type { DisjointKindEntries } from "../disjoint.js"
import { Disjoint } from "../disjoint.js"
import { defineNode, Node } from "../node.js"
import { type ConstraintKind } from "../predicate.js"
import { TypeNode } from "../type.js"
import type { ClassNode } from "./class.js"
import type { DomainNode } from "./domain.js"
import type { ValueNode } from "./value.js"

type BasisNodesByLevel = {
    domain: typeof DomainNode
    class: typeof ClassNode
    value: typeof ValueNode
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

// export const BasisNode = defineNode({

// })

export abstract class BasisNode<
    level extends BasisLevel = BasisLevel,
    child = unknown
> extends Node<"basis", [child]> {
    abstract literalKeysOf(): Key[]
    abstract domain: Domain
    abstract level: level

    private _keyof?: TypeNode
    keyof(): TypeNode {
        if (this._keyof) {
            return this._keyof
        }
        this._keyof = TypeNode.fromValue(...this.literalKeysOf())
        return this._keyof
    }

    hasLevel<level extends BasisLevel>(
        level: level
    ): this is instanceOf<BasisNodesByLevel[level]> {
        return this.level === (level as unknown)
    }

    intersectNode(this: BasisNode, other: BasisNode): BasisNode | Disjoint {
        if (this === other) {
            return this
        }
        if (this.hasLevel("class") && other.hasLevel("class")) {
            return constructorExtends(this.child, other.child)
                ? this
                : constructorExtends(other.child, this.child)
                ? other
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
            ? this
            : precedenceByLevel[other.level] < precedenceByLevel[this.level]
            ? other
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
                    stringify(this.child)
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
