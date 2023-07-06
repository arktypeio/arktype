import type { Domain, extend } from "@arktype/utils"
import type { NodeKind, NodeKinds } from "./node.js"
import { NodeBase } from "./node.js"
import type { TypeNode } from "./type.js"

export type BasisKind = extend<NodeKind, "domain" | "class" | "unit">

export type BasisNode = NodeKinds[BasisKind]

export abstract class BasisNodeBase<rule, meta> extends NodeBase<rule, meta> {
    abstract kind: BasisKind
    abstract domain: Domain
    abstract literalKeys: PropertyKey[]

    keyof(): TypeNode {
        // TODO: node.literal(...literalKeys))
        return {} as never
    }
}

// export type BasisInput<level extends BasisKind = BasisKind> = unknown

// export type inferBasis<basis extends BasisInput> = basis extends Domain
//     ? inferDomain<basis>
//     : basis extends AbstractableConstructor<infer instance>
//     ? instance
//     : basis extends readonly ["===", infer value]
//     ? value
//     : never

// export const basisPrecedenceByKind: Record<BasisKind, number> = {
//     value: 0,
//     class: 1,
//     domain: 2
// }

// export const intersectBases = (
//     l: BasisNode,
//     r: BasisNode
// ): BasisNode | Disjoint => {
//     if (l.hasKind("class") && r.hasKind("class")) {
//         return constructorExtends(l.rule, r.rule)
//             ? l
//             : constructorExtends(r.rule, l.rule)
//             ? r
//             : Disjoint.from("class", l, r)
//     }
//     const disjointEntries: DisjointKindEntries = []
//     if (l.domain !== r.domain) {
//         disjointEntries.push(["domain", { l, r }])
//     }
//     if (l.hasKind("value") && r.hasKind("value")) {
//         if (l.rule !== r.rule) {
//             disjointEntries.push(["value", { l, r }])
//         }
//     }
//     return disjointEntries.length
//         ? Disjoint.fromEntries(disjointEntries)
//         : basisPrecedenceByKind[l.kind] < basisPrecedenceByKind[r.kind]
//         ? l
//         : basisPrecedenceByKind[r.kind] < basisPrecedenceByKind[l.kind]
//         ? r
//         : throwInternalError(
//               `Unexpected non-disjoint intersection from basis nodes with equal precedence ${l} and ${r}`
//           )
// }
