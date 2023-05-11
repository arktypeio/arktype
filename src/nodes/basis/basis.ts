import { writeUnboundableMessage } from "../../parse/ast/bound.js"
import { writeIndivisibleMessage } from "../../parse/ast/divisor.js"
import type { Domain, inferDomain } from "../../utils/domains.js"
import { domainOf } from "../../utils/domains.js"
import { throwInternalError, throwParseError } from "../../utils/errors.js"
import type { evaluate } from "../../utils/generics.js"
import type {
    abstractableConstructor,
    constructor,
    instanceOf
} from "../../utils/objectKinds.js"
import { constructorExtends } from "../../utils/objectKinds.js"
import type { Key } from "../../utils/records.js"
import { stringify } from "../../utils/serialize.js"
import type { DisjointKindEntries } from "../disjoint.js"
import { Disjoint } from "../disjoint.js"
import { Node } from "../node.js"
import { type ConstraintKind } from "../predicate.js"
import { TypeNode } from "../type.js"
import { ClassNode } from "./class.js"
import { DomainNode } from "./domain.js"
import { ValueNode } from "./value.js"

type BasisNodesByLevel = {
    domain: typeof DomainNode
    class: typeof ClassNode
    value: typeof ValueNode
}

type BasisInputs = {
    domain: Domain
    value: ["===", unknown]
    class: abstractableConstructor
}

export type BasisInput<level extends BasisLevel = BasisLevel> =
    BasisInputs[level]

export type inferBasis<basis extends BasisInput> = basis extends Domain
    ? inferDomain<basis>
    : basis extends constructor<infer instance>
    ? instance
    : basis extends ["===", infer value]
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
    level extends BasisLevel = BasisLevel
> extends Node<"basis"> {
    static readonly kind = "basis"
    abstract literalKeysOf(): Key[]
    abstract domain: Domain

    constructor(public level: level, condition: string) {
        super("basis", condition)
    }

    static from<input extends BasisInput>(input: input) {
        switch (typeof input) {
            case "string":
                return new DomainNode(input)
            case "object":
                return new ValueNode(input[1])
            case "function":
                return new ClassNode(input)
            default:
                throwInternalError(
                    `Unexpectedly got a basis input of type ${domainOf(input)}`
                )
        }
    }

    #keyof?: TypeNode
    keyof(): TypeNode {
        if (this.#keyof) {
            return this.#keyof
        }
        this.#keyof = TypeNode.fromValue(...this.literalKeysOf())
        return this.#keyof
    }

    hasLevel<level extends BasisLevel>(
        level: level
    ): this is instanceOf<BasisNodesByLevel[level]> {
        return this.level === (level as unknown)
    }

    intersectNode(other: BasisNode): BasisNode | Disjoint {
        if (this === other) {
            return this
        }
        if (this.hasLevel("class") && other.hasLevel("class")) {
            return constructorExtends(this.instanceOf, other.instanceOf)
                ? this
                : constructorExtends(other.instanceOf, this.instanceOf)
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
                    stringify(this.value)
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
