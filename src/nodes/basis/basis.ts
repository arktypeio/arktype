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
import type { DisjointKindEntries } from "../disjoint.js"
import { Disjoint } from "../disjoint.js"
import { type ConstraintKind } from "../predicate.js"
import { ClassNode } from "./class.js"
import type { DomainNode } from "./domain.js"
import { ValueNode } from "./value.js"

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

export type BasisDefinition = {
    literalKeysOf(): Key[]
    domain: Domain
    level: BasisLevel
    assertAllowsConstraint(kind: ConstraintKind): void
}

export type BasisNode = typeof DomainNode | typeof ValueNode | typeof ClassNode

export type BasisInstance = InstanceType<BasisNode>

export const intersectBases = (
    l: BasisInstance,
    r: BasisInstance
): BasisInstance | Disjoint => {
    if (l === r) {
        return l
    }
    if (l instanceof ClassNode && r instanceof ClassNode) {
        return constructorExtends(l.rule, r.rule)
            ? l
            : constructorExtends(r.rule, l.rule)
            ? r
            : Disjoint.from("class", l, r)
    }
    const disjointEntries: DisjointKindEntries = []
    if (l.domain !== r.domain) {
        disjointEntries.push(["domain", { l, r }])
    }
    if (l instanceof ValueNode && r instanceof ValueNode) {
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

export const assertAllowsConstraint = (
    basis: BasisDefinition,
    kind: ConstraintKind
) => {
    switch (kind) {
        case "divisor":
            if (basis.domain !== "number") {
                throwParseError(writeIndivisibleMessage(basis.domain))
            }
            return
        case "range":
            if (
                basis.domain !== "string" &&
                basis.domain !== "number"
                // !this.hasConstructorExtending(Array, Date)
            ) {
                throwParseError(writeUnboundableMessage(basis.domain))
            }
            return
        case "regex":
            if (basis.domain !== "string") {
                throwInvalidConstraintError("regex", "a string", basis.domain)
            }
            return
        case "props":
            if (basis.domain !== "object") {
                throwInvalidConstraintError("props", "an object", basis.domain)
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
