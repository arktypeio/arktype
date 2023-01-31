import type { Scope, Type } from "../main.ts"
import { undiscriminatableMorphUnionMessage } from "../parse/string/ast.ts"
import type { Domain, Subdomain } from "../utils/domains.ts"
import { domainOf, hasSubdomain, subdomainOf } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type { evaluate, keySet } from "../utils/generics.ts"
import { hasKey, isKeyOf, keysOf } from "../utils/generics.ts"
import type { NumberLiteral } from "../utils/numericLiterals.ts"
import { Path } from "../utils/paths.ts"
import type {
    SerializablePrimitive,
    SerializedPrimitive
} from "../utils/serialize.ts"
import { serializePrimitive } from "../utils/serialize.ts"
import type { Branches } from "./branches.ts"
import { IntersectionState } from "./compose.ts"
import type { TraversalEntry, TypeNode } from "./node.ts"
import type { Branch } from "./predicate.ts"
import { isOptional } from "./rules/props.ts"
import { branchIntersection, flattenBranch } from "./rules/rules.ts"

export type DiscriminatedSwitch = {
    readonly path: Path
    readonly kind: DiscriminantKind
    readonly cases: DiscriminatedCases
}

export type DiscriminatedCases<
    kind extends DiscriminantKind = DiscriminantKind
> = {
    [caseKey in CaseKey<kind>]?: TraversalEntry[]
}

export const flattenBranches = (branches: Branches, type: Type) => {
    const discriminants = calculateDiscriminants(branches, type)
    const indices = branches.map((_, i) => i)
    return discriminate(branches, indices, discriminants, type)
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
    type: Type
): TraversalEntry[] => {
    if (remainingIndices.length === 1) {
        return flattenBranch(originalBranches[remainingIndices[0]], type)
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
                    flattenBranch(originalBranches[i], type)
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
            type
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
    subdomain: Subdomain
    tupleLength: number
    value: unknown
}

const discriminantKinds: keySet<DiscriminantKind> = {
    domain: true,
    subdomain: true,
    tupleLength: true,
    value: true
}

export type DiscriminantKind = evaluate<keyof DiscriminantKinds>

const calculateDiscriminants = (
    branches: Branches,
    type: Type
): Discriminants => {
    const discriminants: Discriminants = {
        disjointsByPair: {},
        casesByDisjoint: {}
    }
    const morphBranches = branches.map((branch) =>
        branchIncludesMorph(branch, type.scope)
    )
    for (let lIndex = 0; lIndex < branches.length - 1; lIndex++) {
        for (let rIndex = lIndex + 1; rIndex < branches.length; rIndex++) {
            const pairKey = `${lIndex}/${rIndex}` as const
            const pairDisjoints: QualifiedDisjoint[] = []
            discriminants.disjointsByPair[pairKey] = pairDisjoints
            const intersectionState = new IntersectionState(type, "|")
            branchIntersection(
                branches[lIndex],
                branches[rIndex],
                intersectionState
            )
            for (const path in intersectionState.disjoints) {
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
            if (
                (morphBranches[lIndex] === true ||
                    morphBranches[rIndex] === true) &&
                pairDisjoints.length === 0
            ) {
                return throwParseError(undiscriminatableMorphUnionMessage)
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
                    const defaultIndices = defaultCaseKeys.map((k) =>
                        parseInt(k)
                    )
                    filteredCases["default"] = defaultIndices
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
    subdomain: subdomainOf,
    domain: domainOf,
    tupleLength: (data) => (Array.isArray(data) ? `${data}` : "default")
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
              nodeIncludesMorph(isOptional(prop) ? prop[1] : prop, $)
          )
        : false

const nodeIncludesMorph = (node: TypeNode, $: Scope): boolean =>
    typeof node === "string"
        ? $.resolve(node).includesMorph
        : Object.values(node).some((predicate) =>
              predicate === true
                  ? false
                  : hasSubdomain(predicate, "Array")
                  ? predicate.some((branch) => branchIncludesMorph(branch, $))
                  : branchIncludesMorph(predicate, $)
          )
