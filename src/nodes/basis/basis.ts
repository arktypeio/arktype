import type { Domain, inferDomain } from "../../utils/domains.js"
import { throwInternalError } from "../../utils/errors.js"
import type { evaluate } from "../../utils/generics.js"
import type {
    AbstractableConstructor,
    Constructor
} from "../../utils/objectKinds.js"
import { constructorExtends } from "../../utils/objectKinds.js"
import type { DisjointKindEntries } from "../disjoint.js"
import { Disjoint } from "../disjoint.js"
import type { Node } from "../node.js"
import type { ClassNode } from "./class.js"
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

export type BasisNodeDef = {
    rule: unknown
    level: BasisLevel
}

// Need an interface to use `this`
// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
interface BasisNodeProps {
    kind: "basis"
    domain: Domain
    literalKeysOf(): PropertyKey[]
    hasLevel<level extends BasisLevel>(
        level: level
    ): this is BasisNodesByLevel[level]
}

export type BasisNode<def extends BasisNodeDef = BasisNodeDef> = Node<
    BasisNodeProps & def
>

export const intersectBases = (
    l: BasisNode,
    r: BasisNode
): BasisNode | Disjoint => {
    if (l.level === "class" && r.level === "class") {
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
