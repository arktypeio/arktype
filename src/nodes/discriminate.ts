import { writeUndiscriminatableMorphUnionMessage } from "../parse/string/ast.ts"
import type { Scope } from "../scopes/scope.ts"
import type { Domain } from "../utils/domains.ts"
import { domainOf } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type { evaluate, keySet } from "../utils/generics.ts"
import { hasKey, isKeyOf, keysOf } from "../utils/generics.ts"
import type { NumberLiteral } from "../utils/numericLiterals.ts"
import type { DefaultObjectKind } from "../utils/objectKinds.ts"
import { isArray, objectKindOf } from "../utils/objectKinds.ts"
import { Path } from "../utils/paths.ts"
import type {
    SerializablePrimitive,
    SerializedPrimitive
} from "../utils/serialize.ts"
import { serializePrimitive } from "../utils/serialize.ts"
import type { Branch, Branches } from "./branch.ts"
import { branchIntersection, flattenBranch } from "./branch.ts"
import { IntersectionState } from "./compose.ts"
import type { FlattenContext, TraversalEntry, TypeNode } from "./node.ts"
import { mappedKeys, propToNode } from "./rules/props.ts"

export type DiscriminatedSwitch<
    kind extends DiscriminantKind = DiscriminantKind
> = {
    readonly path: Path
    readonly kind: kind
    readonly cases: DiscriminatedCases<kind>
}

export type DiscriminatedCases<
    kind extends DiscriminantKind = DiscriminantKind
> = {
    [caseKey in CaseKey<kind>]?: TraversalEntry[]
}

export const flattenBranches = (branches: Branches, ctx: FlattenContext) => {
    const discriminants = calculateDiscriminants(branches, ctx)
    const indices = branches.map((_, i) => i)
    return discriminate(branches, indices, discriminants, ctx)
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
    ctx: FlattenContext
): TraversalEntry[] => {
    if (remainingIndices.length === 1) {
        return flattenBranch(originalBranches[remainingIndices[0]], ctx)
    }
    const bestDiscriminant = findBestDiscriminant(
        remainingIndices,
        discriminants
    )
    if (!bestDiscriminant) {
        return [
            [
                "branches",
                remainingIndices.map((i) =>
                    branchIncludesMorph(
                        originalBranches[i],
                        ctx.type.meta.scope
                    )
                        ? throwParseError(
                              writeUndiscriminatableMorphUnionMessage(
                                  `${ctx.path}`
                              )
                          )
                        : flattenBranch(originalBranches[i], ctx)
                )
            ]
        ]
    }
    const cases = {} as DiscriminatedCases
    let caseKey: CaseKey
    for (caseKey in bestDiscriminant.indexCases) {
        const nextIndices = bestDiscriminant.indexCases[caseKey]!
        cases[caseKey] = discriminate(
            originalBranches,
            nextIndices,
            discriminants,
            ctx
        )
    }
    return [
        [
            "switch",
            {
                path: bestDiscriminant.path,
                kind: bestDiscriminant.kind,
                cases
            }
        ]
    ]
}

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
    objectKind: DefaultObjectKind
    value: unknown
}

const discriminantKinds: keySet<DiscriminantKind> = {
    domain: true,
    objectKind: true,
    value: true
}

export type DiscriminantKind = evaluate<keyof DiscriminantKinds>

const calculateDiscriminants = (
    branches: Branches,
    ctx: FlattenContext
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
            const intersectionState = new IntersectionState(ctx.type, "|")
            branchIntersection(
                branches[lIndex],
                branches[rIndex],
                intersectionState
            )
            for (const path in intersectionState.disjoints) {
                if (path.includes(mappedKeys.index)) {
                    // containers could be empty and therefore their elements cannot be used to discriminate
                    // allowing this via a special case where both are length >0 tracked here:
                    // https://github.com/arktypeio/arktype/issues/593
                    continue
                }
                const { l, r, kind } = intersectionState.disjoints[path]
                if (!isKeyOf(kind, discriminantKinds)) {
                    continue
                }
                const lSerialized = serializeIfAllowed(kind, l)
                const rSerialized = serializeIfAllowed(kind, r)
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
                if (!hasKey(cases, lSerialized)) {
                    cases[lSerialized] = [lIndex]
                } else if (!cases[lSerialized].includes(lIndex)) {
                    cases[lSerialized].push(lIndex)
                }
                if (!hasKey(cases, rSerialized)) {
                    cases[rSerialized] = [rIndex]
                } else if (!cases[rSerialized].includes(rIndex)) {
                    cases[rSerialized].push(rIndex)
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
                let caseKey: CaseKey
                for (caseKey in indexCases) {
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

export const serializeIfAllowed = <kind extends DiscriminantKind>(
    kind: kind,
    data: DiscriminantKinds[kind]
) =>
    (kind === "value" ? serializeIfPrimitive(data) : `${data}`) as
        | CaseKey<kind>
        | undefined

const serializeIfPrimitive = (data: unknown) => {
    const domain = domainOf(data)
    return domain === "object" || domain === "symbol"
        ? undefined
        : serializePrimitive(data as SerializablePrimitive)
}

const caseSerializers: Record<DiscriminantKind, (data: unknown) => string> = {
    value: (data) => serializeIfPrimitive(data) ?? "default",
    objectKind: (data) => objectKindOf(data) ?? "default",
    domain: domainOf
}

export const serializeCase = <kind extends DiscriminantKind>(
    kind: kind,
    data: unknown
) => caseSerializers[kind](data) as CaseKey<kind>

type CaseKey<kind extends DiscriminantKind = DiscriminantKind> =
    kind extends "value"
        ? SerializedPrimitive | "default"
        : kind extends "tupleLength"
        ? NumberLiteral | "default"
        : DiscriminantKinds[kind]

const branchIncludesMorph = (branch: Branch, $: Scope) =>
    "morph" in branch
        ? true
        : "props" in branch
        ? Object.values(branch.props!).some((prop) =>
              nodeIncludesMorph(propToNode(prop), $)
          )
        : false

const nodeIncludesMorph = (node: TypeNode, $: Scope): boolean =>
    typeof node === "string"
        ? $.resolve(node).meta.includesMorph
        : Object.values(node).some((predicate) =>
              predicate === true
                  ? false
                  : isArray(predicate)
                  ? predicate.some((branch) => branchIncludesMorph(branch, $))
                  : branchIncludesMorph(predicate, $)
          )
