import type {
    AbstractableConstructor,
    Constructor,
    Domain,
    evaluate,
    inferDomain
} from "../../../../dev/utils/src/main.js"
import {
    constructorExtends,
    throwInternalError
} from "../../../../dev/utils/src/main.js"
import type { TypeNode } from "../../composite/type.js"
import type { DisjointKindEntries } from "../../disjoint.js"
import { Disjoint } from "../../disjoint.js"
import type { BaseNode } from "../../node.js"
import type { ClassNode } from "./class.js"
import type { DomainNode, NonEnumerableDomain } from "./domain.js"
import type { ValueNode } from "./value.js"

type BasisNodesByKind = {
    domain: DomainNode
    class: ClassNode
    value: ValueNode
}

type BasisInputs = {
    domain: NonEnumerableDomain
    value: readonly ["===", unknown]
    class: AbstractableConstructor
}

export type BasisInput<level extends BasisKind = BasisKind> = BasisInputs[level]

export type inferBasis<basis extends BasisInput> = basis extends Domain
    ? inferDomain<basis>
    : basis extends Constructor<infer instance>
    ? instance
    : basis extends readonly ["===", infer value]
    ? value
    : never

export type BasisKind = evaluate<keyof BasisNodesByKind>

export const basisPrecedenceByKind: Record<BasisKind, number> = {
    value: 0,
    class: 1,
    domain: 2
}

export type BasisNodeSubclass = BasisNodesByKind[BasisKind]

export type BasisNodeDefinition = {
    rule: unknown
}

export interface BasisNode<kind extends BasisKind = BasisKind, rule = unknown>
    extends BaseNode<{ kind: kind; rule: rule; intersectsWith: BasisNode }> {
    domain: Domain
    keyof(): TypeNode
    literalKeys: PropertyKey[]
}

export const intersectBases = (
    l: BasisNode,
    r: BasisNode
): BasisNode | Disjoint => {
    if (l.hasKind("class") && r.hasKind("class")) {
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
    if (l.hasKind("value") && r.hasKind("value")) {
        if (l !== r) {
            disjointEntries.push(["value", { l, r }])
        }
    }
    return disjointEntries.length
        ? Disjoint.fromEntries(disjointEntries)
        : basisPrecedenceByKind[l.kind] < basisPrecedenceByKind[r.kind]
        ? l
        : basisPrecedenceByKind[r.kind] < basisPrecedenceByKind[l.kind]
        ? r
        : throwInternalError(
              `Unexpected non-disjoint intersection from basis nodes with equal precedence ${l} and ${r}`
          )
}
