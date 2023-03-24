import type { Scope } from "../scopes/scope.ts"
import type { Domain } from "../utils/domains.ts"
import { domainOf } from "../utils/domains.ts"
import type { evaluate, keySet } from "../utils/generics.ts"
import { isKeyOf, keysOf } from "../utils/generics.ts"
import type { DefaultObjectKind } from "../utils/objectKinds.ts"
import {
    getExactConstructorObjectKind,
    isArray,
    objectKindOf
} from "../utils/objectKinds.ts"
import { Path } from "../utils/paths.ts"
import type {
    SerializablePrimitive,
    SerializedPrimitive
} from "../utils/serialize.ts"
import { serializePrimitive } from "../utils/serialize.ts"
import type { Branch, Branches } from "./branch.ts"
import { branchIntersection, compileBranch } from "./branch.ts"
import type { Compilation } from "./compile.ts"
import { ComparisonState } from "./compose.ts"
import type { Node } from "./node.ts"
import { mappedKeys, propToNode } from "./rules/props.ts"

export type CaseKey<kind extends DiscriminantKind = DiscriminantKind> =
    DiscriminantKind extends kind ? string : DiscriminantKinds[kind] | "default"

export const compileBranches = (branches: Branches, c: Compilation) => {
    const discriminants = calculateDiscriminants(branches, c)
    const indices = branches.map((_, i) => i)
    return discriminate(branches, indices, discriminants, c)
}

type IndexCases = {
    [caseKey in CaseKey]?: number[]
}

export type QualifiedDisjoint =
    | `${DiscriminantKind}`
    | `${string}/${DiscriminantKind}`

const discriminate = (
    originalBranches: Branches,
    remainingIndices: number[],
    discriminants: Discriminants,
    ctx: Compilation
) => {
    return compileBranch(originalBranches[remainingIndices[0]], ctx)
    // if (remainingIndices.length === 1) {
    //     return compileBranch(originalBranches[remainingIndices[0]], ctx)
    // }
    //     const bestDiscriminant = findBestDiscriminant(
    //         remainingIndices,
    //         discriminants
    //     )
    //     if (!bestDiscriminant) {
    //         return [
    //             [
    //                 "branches",
    //                 remainingIndices.map((i) =>
    //                     branchIncludesMorph(originalBranches[i], ctx.type.scope)
    //                         ? throwParseError(
    //                               writeUndiscriminatableMorphUnionMessage(
    //                                   `${ctx.path}`
    //                               )
    //                           )
    //                         : compileBranch(originalBranches[i], ctx)
    //                 )
    //             ]
    //         ]
    //     }
    //     const cases = {} as DiscriminatedCases
    //     for (const caseKey in bestDiscriminant.indexCases) {
    //         const nextIndices = bestDiscriminant.indexCases[caseKey]!
    //         cases[caseKey] = discriminate(
    //             originalBranches,
    //             nextIndices,
    //             discriminants,
    //             ctx
    //         )
    //         if (caseKey !== "default") {
    //             pruneDiscriminant(
    //                 cases[caseKey]!,
    //                 bestDiscriminant.path,
    //                 bestDiscriminant,
    //                 ctx
    //             )
    //         }
    //     }
    //     return [
    //         [
    //             "switch",
    //             {
    //                 path: bestDiscriminant.path,
    //                 kind: bestDiscriminant.kind,
    //                 cases
    //             }
    //         ]
    //     ]
}

// const pruneDiscriminant = (
//     entries: TraversalEntry[],
//     segments: string[],
//     discriminant: Discriminant,
//     ctx: CompilationState
// ) => {
//     for (let i = 0; i < entries.length; i++) {
//         const [k, v] = entries[i]
//         if (!segments.length) {
//             if (discriminant.kind === "domain") {
//                 if (k === "domain" || k === "domains") {
//                     entries.splice(i, 1)
//                     return
//                 } else if (k === "class" || k === "value") {
//                     // these keys imply a domain, but also add additional
//                     // information, so can't be pruned
//                     return
//                 }
//             } else if (discriminant.kind === k) {
//                 entries.splice(i, 1)
//                 return
//             }
//         } else if (
//             (k === "requiredProp" ||
//                 k === "prerequisiteProp" ||
//                 k === "optionalProp") &&
//             v[0] === segments[0]
//         ) {
//             if (typeof v[1] === "string") {
//                 if (discriminant.kind !== "domain") {
//                     return throwPruneFailure(discriminant)
//                 }
//                 entries.splice(i, 1)
//                 return
//             }
//             pruneDiscriminant(v[1], segments.slice(1), discriminant, ctx)
//             if (v[1].length === 0) {
//                 entries.splice(i, 1)
//             }
//             return
//         }
//         // check for branch keys, which must be traversed even if there are no
//         // segments left
//         if (k === "domains") {
//             /* c8 ignore start */
//             if (keyCount(v) !== 1 || !v.object) {
//                 return throwPruneFailure(discriminant)
//             }
//             /* c8 ignore stop */
//             pruneDiscriminant(v.object, segments, discriminant, ctx)
//             return
//         } else if (k === "switch") {
//             for (const caseKey in v.cases) {
//                 pruneDiscriminant(
//                     v.cases[caseKey]!,
//                     segments,
//                     discriminant,
//                     ctx
//                 )
//             }
//             return
//         } else if (k === "branches") {
//             for (const branch of v) {
//                 pruneDiscriminant(branch, segments, discriminant, ctx)
//             }
//             return
//         }
//     }
//     return throwPruneFailure(discriminant)
// }

// const throwPruneFailure = (discriminant: Discriminant) =>
//     throwInternalError(
//         `Unexpectedly failed to discriminate ${discriminant.kind} at path '${discriminant.path}'`
//     )

type Discriminants = {
    disjointsByPair: DisjointsByPair
    casesByDisjoint: CasesByDisjoint
}

type DisjointsByPair = Record<`${number}/${number}`, QualifiedDisjoint[]>

type CasesByDisjoint = {
    [k in QualifiedDisjoint]?: IndexCases
}

export type DiscriminantKinds = {
    domain: Domain
    class: DefaultObjectKind
    value: SerializedPrimitive
}

const discriminantKinds: keySet<DiscriminantKind> = {
    domain: true,
    class: true,
    value: true
}

export type DiscriminantKind = evaluate<keyof DiscriminantKinds>

const calculateDiscriminants = (
    branches: Branches,
    ctx: Compilation
): Discriminants => {
    const discriminants: Discriminants = {
        disjointsByPair: {},
        casesByDisjoint: {}
    }
    for (let lIndex = 0; lIndex < branches.length - 1; lIndex++) {
        for (let rIndex = lIndex + 1; rIndex < branches.length; rIndex++) {
            const pairKey = `${lIndex}/${rIndex}` as const
            const pairDisjoints: QualifiedDisjoint[] = []
            discriminants.disjointsByPair[pairKey] = pairDisjoints
            const intersectionState = new ComparisonState(ctx.type, "|")
            branchIntersection(
                branches[lIndex],
                branches[rIndex],
                intersectionState
            )
            for (const path in intersectionState.disjointsByPath) {
                if (path.includes(mappedKeys.index)) {
                    // containers could be empty and therefore their elements cannot be used to discriminate
                    // allowing this via a special case where both are length >0 tracked here:
                    // https://github.com/arktypeio/arktype/issues/593
                    continue
                }
                const { l, r, kind } = intersectionState.disjointsByPath[path]
                if (!isKeyOf(kind, discriminantKinds)) {
                    continue
                }
                const lSerialized = serializeDefinitionIfAllowed(kind, l)
                const rSerialized = serializeDefinitionIfAllowed(kind, r)
                if (lSerialized === undefined || rSerialized === undefined) {
                    continue
                }
                const qualifiedDisjoint: QualifiedDisjoint =
                    path === "/" ? kind : `${path}/${kind}`
                pairDisjoints.push(qualifiedDisjoint)
                if (!discriminants.casesByDisjoint[qualifiedDisjoint]) {
                    discriminants.casesByDisjoint[qualifiedDisjoint] = {
                        [lSerialized]: [lIndex],
                        [rSerialized]: [rIndex]
                    }
                    continue
                }
                const cases = discriminants.casesByDisjoint[qualifiedDisjoint]!
                const existingLBranch = cases[lSerialized]
                if (!existingLBranch) {
                    cases[lSerialized] = [lIndex]
                } else if (!existingLBranch.includes(lIndex)) {
                    existingLBranch.push(lIndex)
                }
                const existingRBranch = cases[rSerialized]
                if (!existingRBranch) {
                    cases[rSerialized] = [rIndex]
                } else if (!existingRBranch.includes(rIndex)) {
                    existingRBranch.push(rIndex)
                }
            }
        }
    }
    return discriminants
}

type Discriminant = {
    path: Path
    kind: DiscriminantKind
    indexCases: IndexCases
    score: number
}

const parseQualifiedDisjoint = (qualifiedDisjoint: QualifiedDisjoint) => {
    const path = Path.fromString(qualifiedDisjoint)
    return [path, path.pop()] as [path: Path, kind: DiscriminantKind]
}

const findBestDiscriminant = (
    remainingIndices: number[],
    discriminants: Discriminants
): Discriminant | undefined => {
    let bestDiscriminant: Discriminant | undefined
    for (let i = 0; i < remainingIndices.length - 1; i++) {
        const lIndex = remainingIndices[i]
        for (let j = i + 1; j < remainingIndices.length; j++) {
            const rIndex = remainingIndices[j]
            const candidates =
                discriminants.disjointsByPair[`${lIndex}/${rIndex}`]
            for (const qualifiedDisjoint of candidates) {
                const indexCases =
                    discriminants.casesByDisjoint[qualifiedDisjoint]!
                const filteredCases: IndexCases = {}
                const defaultCases: Record<number, number> = [
                    ...remainingIndices
                ]
                let score = 0
                for (const caseKey in indexCases) {
                    const filteredIndices = indexCases[caseKey]!.filter((i) => {
                        const remainingIndex = remainingIndices.indexOf(i)
                        if (remainingIndex !== -1) {
                            delete defaultCases[remainingIndex]
                            return true
                        }
                    })
                    if (filteredIndices.length === 0) {
                        continue
                    }
                    filteredCases[caseKey] = filteredIndices
                    score++
                }
                const defaultCaseKeys = keysOf(defaultCases)
                if (defaultCaseKeys.length) {
                    filteredCases["default"] = defaultCaseKeys.map((k) =>
                        parseInt(k)
                    )
                }
                if (!bestDiscriminant || score > bestDiscriminant.score) {
                    const [path, kind] =
                        parseQualifiedDisjoint(qualifiedDisjoint)
                    bestDiscriminant = {
                        path,
                        kind,
                        indexCases: filteredCases,
                        score
                    }
                    if (score === remainingIndices.length) {
                        // if we find a candidate that discriminates all branches, return early
                        return bestDiscriminant
                    }
                }
            }
        }
    }
    return bestDiscriminant
}

type DiscriminantDefinitionKinds = {
    value: unknown
    domain: Domain
    class: object
}

export const serializeDefinitionIfAllowed = <kind extends DiscriminantKind>(
    kind: kind,
    definition: DiscriminantDefinitionKinds[kind]
): string | undefined => {
    switch (kind) {
        case "value":
            return serializeIfPrimitive(definition)
        case "domain":
            return definition as Domain
        case "class":
            return getExactConstructorObjectKind(definition)
        default:
            return
    }
}

const serializeIfPrimitive = (data: unknown) => {
    const domain = domainOf(data)
    return domain === "object" || domain === "symbol"
        ? undefined
        : serializePrimitive(data as SerializablePrimitive)
}

const serializeData: {
    [kind in DiscriminantKind]: (
        data: unknown
    ) => DiscriminantKinds[kind] | "default"
} = {
    value: (data) => serializeIfPrimitive(data) ?? "default",
    class: (data) =>
        (objectKindOf(data) as DefaultObjectKind | undefined) ?? "default",
    domain: domainOf
}

export const serializeCase = <kind extends DiscriminantKind>(
    kind: kind,
    data: unknown
) => serializeData[kind](data)

const branchIncludesMorph = (branch: Branch, $: Scope) =>
    "morph" in branch
        ? true
        : "props" in branch
        ? Object.values(branch.props!).some((prop) =>
              nodeIncludesMorph(propToNode(prop), $)
          )
        : false

const nodeIncludesMorph = (node: Node, $: Scope): boolean =>
    typeof node === "string"
        ? $.resolve(node).includesMorph
        : Object.values($.resolveTypeNode(node)).some((predicate) =>
              predicate === true
                  ? false
                  : isArray(predicate)
                  ? predicate.some((branch) => branchIncludesMorph(branch, $))
                  : branchIncludesMorph(predicate, $)
          )
