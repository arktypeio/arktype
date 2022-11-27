// import type { ScopeRoot } from "../scope.js"
// import type { record } from "../utils/dataTypes.js"
// import { throwInternalError } from "../utils/errors.js"
// import { pathToSegments, pushKey } from "../utils/paths.js"
import type { Node } from "../nodes/node.js"
import type { ScopeRoot } from "../scope.js"

export const compile = (attributes: Node, scope: ScopeRoot): Node => {
    return attributes
    // const compiled = discriminate(attributes, scope)
    // if (attributes.props) {
    //     for (const k in attributes.props) {
    //         compile(attributes.props[k], scope)
    //     }
    // }
    // return compiled
}

// export const queryPath = (attributes: TypeNode, path: string) => {
//     // const segments = pathToSegments(path)
//     // let currentAttributes = attributes
//     // for (const segment of segments) {
//     //     if (currentAttributes.props?.[segment] === undefined) {
//     //         return undefined
//     //     }
//     //     currentAttributes = currentAttributes.props[segment]
//     // }
//     // return currentAttributes[key]
// }

// export type DiscriminatedKey = "type" | "value"

// export type DiscriminatedPath = AttributePath<DiscriminatedKey>

// type Discriminant = {
//     path: DiscriminatedPath
//     score: number
// }

// export const discriminate = (base: Type, scope: ScopeRoot): Type =>
//     base.branches
//         ? {
//               ...base,
//               branches: [
//                   base.branches[0],
//                   base.branches[0] === "|"
//                       ? discriminateBranches(base.branches[1], scope)
//                       : base.branches[0] === "&"
//                       ? base.branches[1].map((intersectedUnion) =>
//                             intersectedUnion[0] === "|"
//                                 ? discriminateBranches(
//                                       intersectedUnion[1],
//                                       scope
//                                   )
//                                 : throwInternalError(
//                                       unexpectedRediscriminationMessage
//                                   )
//                         )
//                       : throwInternalError(unexpectedRediscriminationMessage)
//               ] as Branches
//           }
//         : base

// const unexpectedRediscriminationMessage =
//     "Unexpected attempt to rediscriminated branches"

// const discriminateBranches = (
//     branches: Type[],
//     scope: ScopeRoot
// ): UnionBranches => {
//     const discriminant = greedyDiscriminant("", branches)
//     if (!discriminant) {
//         return ["|", branches]
//     }
//     const branchesByValue: record<Type[]> = {}
//     for (let i = 0; i < branches.length; i++) {
//         const value = queryAttribute(branches[i], discriminant.path)
//         const caseKey = value ?? "default"
//         branchesByValue[caseKey] ??= []
//         branchesByValue[caseKey].push(
//             value
//                 ? excludeDiscriminant(
//                       branches[i],
//                       discriminant.path,
//                       value,
//                       scope
//                   )
//                 : branches[i]
//         )
//     }
//     const cases: record<Type> = {}
//     for (const value in branchesByValue) {
//         const base: Type = compress(branchesByValue[value], scope)
//         cases[value] = discriminate(base, scope)
//     }
//     return ["?", discriminant.path, cases]
// }

// const excludeDiscriminant = <k extends DiscriminatedKey>(
//     a: Type,
//     path: AttributePath<k>,
//     value: Attribute<k>,
//     scope: ScopeRoot
// ): Type => {
//     const segments = pathToSegments(path)
//     const key = segments.pop() as k
//     let discriminant: MutableAttributes = { [key]: value }
//     for (let i = segments.length - 1; i >= 0; i--) {
//         discriminant = { props: { [segments[i]]: discriminant } }
//     }
//     return exclude(a, discriminant, scope) ?? {}
// }

// const greedyDiscriminant = (
//     path: string,
//     branches: Type[]
// ): Discriminant | undefined =>
//     greedyShallowDiscriminant(path, branches) ??
//     greedyPropsDiscriminant(path, branches)

// const greedyShallowDiscriminant = (
//     path: string,
//     branches: Type[]
// ): Discriminant | undefined => {
//     const typeScore = disjointScore(branches, "type")
//     const valueScore = disjointScore(branches, "value")
//     if (typeScore || valueScore) {
//         return typeScore > valueScore
//             ? { path: finalizeDiscriminantPath(path, "type"), score: typeScore }
//             : {
//                   path: finalizeDiscriminantPath(path, "value"),
//                   score: valueScore
//               }
//     }
// }

// const greedyPropsDiscriminant = (path: string, branches: Type[]) => {
//     let bestDiscriminant: Discriminant | undefined
//     const sortedPropFrequencies = sortPropsByFrequency(branches)
//     for (const [propKey, branchAppearances] of sortedPropFrequencies) {
//         const maxScore = maxEdges(branchAppearances)
//         if (bestDiscriminant && bestDiscriminant.score >= maxScore) {
//             return bestDiscriminant
//         }
//         const propDiscriminant = greedyDiscriminant(
//             pushKey(path, propKey),
//             branches.map((branch) => branch.props?.[propKey] ?? {})
//         )
//         if (
//             propDiscriminant &&
//             (!bestDiscriminant ||
//                 propDiscriminant.score > bestDiscriminant.score)
//         ) {
//             bestDiscriminant = propDiscriminant
//         }
//     }
//     return bestDiscriminant
// }

// const maxEdges = (vertexCount: number) => (vertexCount * (vertexCount - 1)) / 2

// type PropFrequencyEntry = [propKey: string, appearances: number]

// const sortPropsByFrequency = (branches: Type[]): PropFrequencyEntry[] => {
//     const appearancesByProp: record<number> = {}
//     for (let i = 0; i < branches.length; i++) {
//         if (!branches[i].props) {
//             continue
//         }
//         for (const propKey in branches[i].props) {
//             appearancesByProp[propKey] = appearancesByProp[propKey]
//                 ? appearancesByProp[propKey] + 1
//                 : 1
//         }
//     }
//     return Object.entries(appearancesByProp).sort((a, b) => b[1] - a[1])
// }

// const disjointScore = (branches: Type[], key: DiscriminatedKey) => {
//     let score = 0
//     for (let i = 0; i < branches.length; i++) {
//         for (let j = i + 1; j < branches.length; j++) {
//             if (
//                 branches[i][key] &&
//                 branches[j][key] &&
//                 branches[i][key] !== branches[j][key]
//             ) {
//                 score++
//             }
//         }
//     }
//     return score
// }

// const finalizeDiscriminantPath = (path: string, key: DiscriminatedKey) =>
//     path ? (`${path}.${key}` as const) : key
