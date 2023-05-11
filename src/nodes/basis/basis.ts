import { writeUnboundableMessage } from "../../parse/ast/bound.js"
import { writeIndivisibleMessage } from "../../parse/ast/divisor.js"
import type { Domain, inferDomain } from "../../utils/domains.js"
import { domainOf } from "../../utils/domains.js"
import { throwInternalError, throwParseError } from "../../utils/errors.js"
import type { evaluate } from "../../utils/generics.js"
import type { constructor, instanceOf } from "../../utils/objectKinds.js"
import { constructorExtends } from "../../utils/objectKinds.js"
import type { entryOf, Key } from "../../utils/records.js"
import { stringify } from "../../utils/serialize.js"
import type { DisjointKindEntries } from "../disjoint.js"
import { Disjoint } from "../disjoint.js"
import { Node } from "../node.js"
import { type ConstraintKind } from "../predicate.js"
import { ClassNode } from "./class.js"
import { DomainNode } from "./domain.js"
import { ValueNode } from "./value.js"

type BasisNodesByLevel = {
    domain: typeof DomainNode
    class: typeof ClassNode
    value: typeof ValueNode
}

type BasisRulesByLevel = {
    [level in BasisLevel]: ConstructorParameters<BasisNodesByLevel[level]>[0]
}

export type Basis<level extends BasisLevel = BasisLevel> =
    BasisNodesByLevel[level]

export type inferBasis<basis extends Basis> = basis extends Domain
    ? inferDomain<basis>
    : basis extends constructor<infer instance>
    ? instance
    : basis extends ["===", infer value]
    ? value
    : never

export type BasisLevel = evaluate<keyof BasisNodesByLevel>

const levelOf = (basis: Basis): BasisLevel =>
    typeof basis === "string"
        ? "domain"
        : typeof basis === "object"
        ? "value"
        : typeof basis === "function"
        ? "class"
        : throwInternalError(
              `Unexpectedly got a basis of type ${domainOf(basis)}`
          )

export const precedenceByLevel: Record<BasisLevel, number> = {
    value: 0,
    class: 1,
    domain: 2
}

export type BasisNodeSubclass = BasisNodesByLevel[BasisLevel]

export type BasisEntry = entryOf<BasisRulesByLevel>

export abstract class BasisNode<
    level extends BasisLevel = BasisLevel
> extends Node<"basis"> {
    static readonly kind = "basis"
    abstract literalKeysOf(): Key[]
    abstract domain: Domain

    constructor(public level: level, input: BasisRulesByLevel[level]) {
        super(BasisNode, [level, input])
    }

    hasLevel<level extends BasisLevel>(
        level: level
    ): this is instanceOf<BasisNodesByLevel[level]> {
        return this.level === (level as unknown)
    }

    static compile(basisEntry: BasisEntry) {
        return basisEntry[0] === "domain"
            ? DomainNode.compile(basisEntry[1])
            : basisEntry[0] === "value"
            ? ValueNode.compile(basisEntry[1])
            : ClassNode.compile(basisEntry[1])
    }

    static intersect(l: BasisNode, r: BasisNode): BasisNode | Disjoint {
        if (l === r) {
            return l
        }
        if (l.hasLevel("class") && r.hasLevel("class")) {
            return constructorExtends(l.instanceOf, r.instanceOf)
                ? l
                : constructorExtends(r.instanceOf, l.instanceOf)
                ? r
                : Disjoint.from("class", l, r)
        }
        const disjointEntries: DisjointKindEntries = []
        if (l.domain !== r.domain) {
            disjointEntries.push(["domain", { l, r }])
        }
        if (l.hasLevel("value") && r.hasLevel("value")) {
            if (l !== r) {
                disjointEntries.push(["value", { l, r }])
            }
        }
        return disjointEntries.length
            ? Disjoint.fromEntries(disjointEntries)
            : precedenceByLevel[l.level] < precedenceByLevel[r.level]
            ? l
            : precedenceByLevel[r.level] < precedenceByLevel[l.level]
            ? r
            : throwInternalError(
                  `Unexpected non-disjoint intersection from basis nodes with equal precedence ${l} and ${r}`
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
