import { as } from "../parse/definition.js"
import type { inferIn } from "../type.js"
import type { Domain } from "../utils/domains.js"
import { throwParseError } from "../utils/errors.js"
import type { evaluate, keySet, List } from "../utils/generics.js"
import { isKeyOf, keysOf } from "../utils/generics.js"
import type { DefaultObjectKind } from "../utils/objectKinds.js"
import { Path } from "../utils/paths.js"
import type { SerializedPrimitive } from "../utils/serialize.js"
import type { BasisNode } from "./basis.js"
import type { CompilationState, CompiledAssertion } from "./node.js"
import { Disjoint, Node } from "./node.js"
import type {
    ConstraintKind,
    inferPredicateDefinition,
    PredicateDefinition
} from "./predicate.js"
import { PredicateNode } from "./predicate.js"

type inferBranches<branches extends TypeNodeInput> = {
    [i in keyof branches]: branches[i] extends PredicateDefinition
        ? inferPredicateDefinition<branches[i]>
        : branches[i] extends PredicateNode<infer t>
        ? t
        : never
}[number]

export type TypeNodeInput = List<PredicateDefinition | PredicateNode>

export class TypeNode<t = unknown> extends Node<
    typeof TypeNode,
    unknown,
    inferIn<t>
> {
    declare [as]: t

    static readonly kind = "type"

    constructor(public branches: PredicateNode[]) {
        super(TypeNode, branches)
    }

    static from<branches extends TypeNodeInput>(...branches: branches) {
        const branchNodes = branches.map((branch) =>
            branch instanceof PredicateNode
                ? branch
                : PredicateNode.from(branch as any)
        )
        const uniquenessByIndex: Record<number, boolean> = branchNodes.map(
            () => true
        )
        for (let i = 0; i < branchNodes.length; i++) {
            for (
                let j = i + 1;
                j < branchNodes.length && uniquenessByIndex[i];
                j++
            ) {
                if (!uniquenessByIndex[j]) {
                    continue
                }
                if (branchNodes[i] === branchNodes[j]) {
                    // if the two branches are equal, only "j" is marked as
                    // redundant so at least one copy could still be included in
                    // the final set of branches.
                    uniquenessByIndex[j] = false
                    continue
                }
                const intersection = branchNodes[i].intersect(branchNodes[j])
                if (intersection === branchNodes[i]) {
                    uniquenessByIndex[i] = false
                } else if (intersection === branchNodes[j]) {
                    uniquenessByIndex[j] = false
                }
            }
        }
        return new TypeNode<inferBranches<branches>>(
            branchNodes.filter((_, i) => uniquenessByIndex[i])
        )
    }

    static compile(branches: readonly PredicateNode[]): CompiledAssertion {
        switch (branches.length) {
            case 0:
                return "data !== data"
            case 1:
                return branches[0].key
            default:
                return `(${branches
                    .map((branch) => branch.key)
                    .sort()
                    .join(" || ")})` as CompiledAssertion
        }
    }

    compileTraversal(s: CompilationState): string {
        switch (this.branches.length) {
            case 0:
                return "throw new Error();"
            case 1:
                return this.branches[0].compileTraversal(s)
            default:
                s.unionDepth++
                const result = `state.pushUnion();
                        ${this.branches
                            .map(
                                (rules) => `(() => {
                            ${rules.compileTraversal(s)}
                            })()`
                            )
                            .join(" && ")};
                        state.popUnion(${this.branches.length}, ${s.data}, ${
                    s.path.json
                });`
                s.unionDepth--
                return result
        }
    }

    static compare(l: TypeNode, r: TypeNode): TypeNode | Disjoint {
        if (l === r) {
            return l
        }
        if (l.branches.length === 1 && r.branches.length === 1) {
            const result = l.branches[0].intersect(r.branches[0])
            return result instanceof Disjoint ? result : new TypeNode([result])
        }
        const branches = branchwiseIntersection(l.branches, r.branches)
        return branches.length
            ? new TypeNode(branches)
            : new Disjoint("union", l, r)
    }

    constrain<kind extends ConstraintKind>(
        kind: kind,
        definition: PredicateDefinition[kind]
    ) {
        return new TypeNode(
            this.branches.map((branch) => branch.constrain(kind, definition))
        )
    }

    and(other: TypeNode): TypeNode {
        const result = this.intersect(other)
        return result instanceof TypeNode
            ? result
            : throwParseError(`Unsatisfiable`)
    }

    or(other: TypeNode): TypeNode {
        if (this === other) {
            return this
        }
        return new TypeNode([...this.branches, ...other.branches])
    }

    get literalValue(): BasisNode<"value"> | undefined {
        return this.branches.length === 1
            ? this.branches[0].literalValue
            : undefined
    }

    keyOf() {
        // const predicateKeys = keysOf(node).map((domain) =>
        //     keysOfPredicate(domain, node[domain]!)
        // )
        // const sharedKeys = sharedKeysOf(predicateKeys)

        // if (!sharedKeys.length) {
        //     return writeImplicitNeverMessage(ctx.path, "keyof")
        // }

        // const keyBranches: ConstraintsNode[] = []

        // for (const key of sharedKeys) {
        //     const keyType = typeof key
        //     if (
        //         keyType === "string" ||
        //         keyType === "number" ||
        //         keyType === "symbol"
        //     ) {
        //         keyBranches.push(ConstraintsNode.from({ value: key }))
        //     } else if (key === wellFormedNonNegativeIntegerMatcher) {
        //         keyBranches.push(arrayIndexStringBranch, arrayIndexNumberBranch)
        //     } else {
        //         return throwInternalError(
        //             `Unexpected keyof key '${stringify(key)}'`
        //         )
        //     }
        // }

        return this
    }

    toArray() {
        return TypeNode.from({
            basis: "object",
            props: {
                named: {},
                // TODO: fix
                indexed: []
            }
        })
    }
}

export const never = new TypeNode([])

const branchwiseIntersection = (
    lBranches: List<PredicateNode>,
    rBranches: List<PredicateNode>
) => {
    // Branches that are determined to be a subtype of an opposite branch are
    // guaranteed to be a member of the final reduced intersection, so long as
    // each individual set of branches has been correctly reduced to exclude
    // redundancies.
    const finalBranches: PredicateNode[] = []
    // Each rBranch is initialized to an empty array to which distinct
    // intersections will be appended. If the rBranch is identified as a
    // subtype or equal of any lBranch, the corresponding value should be
    // set to null so we can avoid including previous/future intersections
    // in the final result.
    const candidatesByR: (PredicateNode[] | null)[] = rBranches.map(() => [])
    for (let lIndex = 0; lIndex < lBranches.length; lIndex++) {
        const l = lBranches[lIndex]
        let currentCandidateByR: { [rIndex in number]: PredicateNode } = {}
        for (let rIndex = 0; rIndex < rBranches.length; rIndex++) {
            const r = rBranches[rIndex]
            if (!candidatesByR[rIndex]) {
                // we've identified this rBranch as a subtype of
                // an lBranch and will not yield any distinct intersections.
                continue
            }
            if (l === r) {
                // Combination of subtype and supertype cases
                finalBranches.push(l)
                candidatesByR[rIndex] = null
                currentCandidateByR = {}
                break
            }
            const branchIntersection = l.intersect(r)
            if (branchIntersection instanceof Disjoint) {
                // doesn't tell us about any redundancies or add a distinct intersection
                continue
            }
            if (branchIntersection === l) {
                // If l is a subtype of the current r branch, intersections
                // with previous and remaining branches of r won't lead to
                // distinct intersections, so empty currentCandidatesByR and break
                // from the inner loop.
                finalBranches.push(l)
                currentCandidateByR = {}
                break
            }
            if (branchIntersection === r) {
                // If r is a subtype of the current l branch, set its
                // intersections to null, removing any previous
                // intersections and preventing any of its
                // remaining intersections from being computed.
                finalBranches.push(r)
                candidatesByR[rIndex] = null
                continue
            }
            // If neither l nor r is a subtype of the other, add their
            // intersection as a candidate to the current batch (could
            // still be removed if it is determined l or r is a subtype
            // of a remaining branch).
            currentCandidateByR[rIndex] = branchIntersection
        }
        for (const rIndex in currentCandidateByR) {
            // candidatesByR at rIndex should never be null if it is in currentCandidates
            candidatesByR[rIndex]!.push(currentCandidateByR[rIndex])
        }
    }
    // All remaining candidates are distinct, so include them in the final result
    for (const candidates of candidatesByR) {
        candidates?.forEach((candidate) => finalBranches.push(candidate))
    }
    return finalBranches
}

export type CaseKey<kind extends DiscriminantKind = DiscriminantKind> =
    DiscriminantKind extends kind ? string : DiscriminantKinds[kind] | "default"

// export const compileBranches = (
//     branches: PredicateNode[],
//     c: CompilationState
// ) => {
//     const discriminants = calculateDiscriminants(branches, c)
//     const indices = branches.map((_, i) => i)
//     return discriminate(branches, indices, discriminants, c)
// }

type IndexCases = {
    [caseKey in CaseKey]?: number[]
}

export type QualifiedDisjoint =
    | `${DiscriminantKind}`
    | `${string}/${DiscriminantKind}`

// const discriminate = (
//     originalBranches: PredicateNode[],
//     remainingIndices: number[],
//     discriminants: Discriminants,
//     c: CompilationState
// ) => {
//     if (remainingIndices.length === 1) {
//         return compileBranch(originalBranches[remainingIndices[0]], ctx)
//     }
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
// }

type Discriminants = {
    disjointsByPair: DisjointsByPair
    casesByDisjoint: CasesByDisjoint
}

type DisjointsByPair = Record<`${number}/${number}`, QualifiedDisjoint[]>

type CasesByDisjoint = {
    [k in QualifiedDisjoint]?: IndexCases
}

export type DiscriminantKinds = {
    kind: Domain
    class: DefaultObjectKind
    value: SerializedPrimitive
}

const discriminantKinds: keySet<DiscriminantKind> = {
    kind: true,
    class: true,
    value: true
}

export type DiscriminantKind = evaluate<keyof DiscriminantKinds>

const calculateDiscriminants = (
    branches: PredicateNode[],
    s: CompilationState
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
            const result = branches[lIndex].intersect(branches[rIndex])
            const disjointsByPath: Record<string, Disjoint> = {}
            for (const path in disjointsByPath) {
                if (path.includes("mapped")) {
                    // containers could be empty and therefore their elements cannot be used to discriminate
                    // allowing this via a special case where both are length >0 tracked here:
                    // https://github.com/arktypeio/arktype/issues/593
                    continue
                }
                const { l, r, kind } = disjointsByPath[path]
                if (!isKeyOf(kind, discriminantKinds)) {
                    continue
                }
                // TODO: fix
                const lSerialized = String(l) //serializeDefinitionIfAllowed(kind, l)
                const rSerialized = String(r) //serializeDefinitionIfAllowed(kind, r)
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
