// import type { ScopeRoot } from "../scope.js"
// import type { mutable } from "../utils/generics.js"
// import { listFrom } from "../utils/generics.js"
// import { pathToSegments } from "../utils/paths.js"
// import type { array, dict, TypeName } from "../utils/typeOf.js"
// import { hasType } from "../utils/typeOf.js"
// import { intersection } from "./intersection.js"
// import type { Attributes, NameNode, Node } from "./node.js"

// export type DiscriminatedBranches = [
//     token: "?",
//     path: string,
//     cases: DiscriminatedCases
// ]

// export type DiscriminatedCases = { [k in TypeName]?: Node }

// export const compile = (attributes: Node, scope: ScopeRoot): Node => {
//     const compiled = discriminate(attributes, scope)
//     if (attributes.props) {
//         for (const k in attributes.props) {
//             compile(attributes.props[k], scope)
//         }
//     }
//     return compiled
// }

// export const queryPath = (attributes: Node, path: string) => {
//     const segments = pathToSegments(path)
//     let currentAttributes = attributes
//     for (const segment of segments) {
//         if (currentAttributes.props?.[segment] === undefined) {
//             return undefined
//         }
//         currentAttributes = currentAttributes.props[segment]
//     }
//     return currentAttributes[key]
// }

// type Discriminant = {
//     path: DiscriminantPath
//     score: number
// }

// const discriminateBranches = (branches: Node[], scope: ScopeRoot): Branches => {
//     const discriminant = greedyDiscriminant("", branches)
//     if (!discriminant) {
//         return branches
//     }
//     const branchesByValue: dict<Branches> = {}
//     for (let i = 0; i < branches.length; i++) {
//         const value = queryPath(branches[i], discriminant.path)
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
//         cases[value] = discriminate(base, scope)
//     }
//     return ["?", discriminant.path, cases]
// }

// const greedyDiscriminant = (
//     path: string,
//     branches: Node[]
// ): Discriminant | undefined =>
//     greedyShallowDiscriminant(path, branches) ??
//     greedyPropsDiscriminant(path, branches)

// const greedyShallowDiscriminant = (
//     path: string,
//     branches: Node[]
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

// const greedyPropsDiscriminant = (path: string, branches: Node[]) => {
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

// const sortPropsByFrequency = (branches: Node[]): PropFrequencyEntry[] => {
//     const appearancesByProp: mutable<dict<number>> = {}
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

// const disjointScore = (branches: Node[], key: DiscriminatedKey) => {
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
