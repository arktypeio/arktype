import { chainableNoOpProxy } from "../utils/chainableNoOpProxy.ts"
import type { Domain } from "../utils/domains.ts"
import { domainOf } from "../utils/domains.ts"
import type { evaluate, keySet } from "../utils/generics.ts"
import { isKeyOf, keysOf } from "../utils/generics.ts"
import type { DefaultObjectKind } from "../utils/objectKinds.ts"
import {
    getExactConstructorObjectKind,
    objectKindOf
} from "../utils/objectKinds.ts"
import { Path } from "../utils/paths.ts"
import type {
    SerializablePrimitive,
    SerializedPrimitive
} from "../utils/serialize.ts"
import { serializePrimitive } from "../utils/serialize.ts"
import type { RuleSet } from "./branch.ts"
import { BranchNode } from "./branch.ts"
import type { Compilation } from "./node.ts"
import { ComparisonState, Node } from "./node.ts"
import { mappedKeys } from "./rules/props.ts"

export type BranchesComparison = {
    lStrictSubtypeIndices: number[]
    rStrictSubtypeIndices: number[]
    equalIndexPairs: [lIndex: number, rIndex: number][]
    distinctIntersections: BranchNode[]
}

type InstantiateBranch<branch extends BranchInput> = branch extends RuleSet
    ? BranchNode<branch>
    : branch

type BranchInput = RuleSet | BranchNode

export class TypeNode<
    branches extends BranchInput[] = BranchInput[]
> extends Node<TypeNode> {
    branches: BranchNode[]

    // TODO: move union checks here
    constructor(...branches: branches) {
        const branchNodes: BranchNode[] = []
        for (const branch of branches) {
            const candidateNode: BranchNode =
                branch instanceof BranchNode ? branch : new BranchNode(branch)
            if (!branchNodes.some(candidateNode.extends)) {
                branchNodes.push(candidateNode)
            }
        }
        // TODO: fix
        super(JSON.stringify(branchNodes.map((_) => _.id)))
        this.branches = branchNodes
    }

    get infer(): InstantiateBranch<branches[number]>["infer"] {
        return chainableNoOpProxy
    }

    intersect(other: TypeNode, s: ComparisonState): TypeNode {
        if (this.branches.length === 1 && other.branches.length === 1) {
            const intersection = this.branches[0].intersect(
                other.branches[0],
                s
            )
            return intersection.isDisjoint()
                ? intersection
                : new TypeNode(intersection)
        }
        const comparison = compareBranches(this.branches, other.branches, s)
        const resultBranches = [
            ...comparison.distinctIntersections,
            ...comparison.equalIndexPairs.map(
                (indices) => this.branches[indices[0]]
            ),
            ...comparison.lStrictSubtypeIndices.map(
                (lIndex) => this.branches[lIndex]
            ),
            ...comparison.rStrictSubtypeIndices.map(
                (rIndex) => other.branches[rIndex]
            )
        ]
        if (resultBranches.length === 0) {
            return s.addDisjoint("union", this.branches, other.branches)
        }
        return new TypeNode(...resultBranches)
    }

    union(other: TypeNode): TypeNode {
        const s = new ComparisonState()
        if (this.branches.length === 1 && other.branches.length === 1) {
            const intersection = this.branches[0].intersect(
                other.branches[0],
                s
            )
            return intersection === this.branches[0]
                ? // this is a subtype of other, return other
                  other
                : intersection === other.branches[0]
                ? // other is a subtype of this, return this
                  this
                : // this and other are mutually distinct, return a new type
                  new TypeNode(this.branches[0], other.branches[0])
        }
        const comparison = compareBranches(this.branches, other.branches, s)
        const resultBranches = [
            ...this.branches.filter(
                (_, lIndex) =>
                    !comparison.lStrictSubtypeIndices.includes(lIndex)
            ),
            ...other.branches.filter(
                (_, rIndex) =>
                    !comparison.rStrictSubtypeIndices.includes(rIndex) &&
                    // ensure equal branches are only included once
                    !comparison.equalIndexPairs.some(
                        (indexPair) => indexPair[1] === rIndex
                    )
            )
        ]
        // TODO: if a boolean has multiple branches, neither of which is a
        // subtype of the other, it consists of two opposite literals
        // and can be simplified to a non-literal boolean.
        return new TypeNode(...resultBranches)
    }

    allows(value: unknown) {
        return !value
    }

    compile(c: Compilation): string {
        return ""
    }

    // toArray() {
    //     return {
    //         object: {
    //             instance: Array,
    //             props: {
    //                 [mappedKeys.index]: this
    //             }
    //         }
    //     }
    // }
}

const compareBranches = (
    lBranches: BranchNode[],
    rBranches: BranchNode[],
    state: ComparisonState
) => {
    const comparison: BranchesComparison = {
        lStrictSubtypeIndices: [],
        rStrictSubtypeIndices: [],
        equalIndexPairs: [],
        distinctIntersections: []
    }
    // Each rBranch is initialized to an empty array to which distinct
    // intersections will be appended. If the rBranch is identified as a
    // subtype (or equal) of any lBranch, the corresponding value should be
    // set to null so we can avoid including previous/future intersections
    // in the final result.
    const candidatesByR: (BranchNode[] | null)[] = rBranches.map(() => [])
    for (let lIndex = 0; lIndex < lBranches.length; lIndex++) {
        const l = lBranches[lIndex]
        let intersectionsOfL: { [rIndex in number]: BranchNode } = {}
        for (let rIndex = 0; rIndex < rBranches.length; rIndex++) {
            if (!candidatesByR[rIndex]) {
                // we've identified this rBranch as a subtype of
                // an lBranch and will not yield any distinct intersections.
                continue
            }
            const r = rBranches[rIndex]
            const branchIntersection = l.intersect(r, state)
            if (branchIntersection.isDisjoint()) {
                // doesn't tell us about any redundancies or add a distinct intersection
                continue
            }
            if (branchIntersection === l) {
                if (branchIntersection === r) {
                    // If branches are equal, also execute logic explained in supertype case.
                    candidatesByR[rIndex] = null
                    comparison.equalIndexPairs.push([lIndex, rIndex])
                } else {
                    comparison.lStrictSubtypeIndices.push(lIndex)
                }
                // If l is a subtype of the current r branch, intersections
                // with previous and remaining branches of r won't lead to
                // distinct intersections, so empty lIntersections and break
                // from the inner loop.
                intersectionsOfL = {}
                break
            }
            if (branchIntersection === r) {
                // If r is a subtype of the current l branch, we set its
                // intersections to null, removing any previous
                // intersections including it and preventing any of its
                // remaining intersections from being computed.
                candidatesByR[rIndex] = null
                comparison.rStrictSubtypeIndices.push(rIndex)
            } else {
                // If neither l nor r is a subtype of the other, add their
                // intersection as a candidate for the final result (could
                // still be removed if it is determined l or r is a subtype
                // of a remaining branch).
                intersectionsOfL[rIndex] = branchIntersection
            }
        }
        for (const rIndex in intersectionsOfL) {
            candidatesByR[rIndex]?.push(intersectionsOfL[rIndex])
        }
    }
    return comparison
}

// const state = new IntersectionState(type, "&")
// const result = nodeIntersection(l, r, state)
// return isDisjoint(result)
//     ? throwParseError(compileDisjointReasonsMessage(state.disjoints))
//     : isEquality(result)
//     ? l
//     : result

export type CaseKey<kind extends DiscriminantKind = DiscriminantKind> =
    DiscriminantKind extends kind ? string : DiscriminantKinds[kind] | "default"

export const compileBranches = (branches: BranchNode[], c: Compilation) => {
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
    originalBranches: BranchNode[],
    remainingIndices: number[],
    discriminants: Discriminants,
    c: Compilation
) => {
    return originalBranches[remainingIndices[0]].compile(c)
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
    branches: BranchNode[],
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
            const intersectionState = new ComparisonState()
            branches[lIndex].intersect(branches[rIndex], intersectionState)
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
