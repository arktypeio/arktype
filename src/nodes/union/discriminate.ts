import {
    entriesOf,
    isKeyOf,
    throwInternalError,
    transform
} from "@arktype/utils"
import type {
    Domain,
    evaluate,
    keySet,
    mutable,
    SerializedPrimitive
} from "@arktype/utils"
import { Disjoint } from "../disjoint.js"
import type { SerializedPath } from "../disjoint.js"
import type { PredicateNode } from "../predicate/predicate.js"
import type { BasisNode } from "../primitive/basis.js"
import type { UnitNode } from "../primitive/unit.js"

export type CaseKey<kind extends DiscriminantKind = DiscriminantKind> =
    DiscriminantKind extends kind ? string : DiscriminantKinds[kind] | "default"

export type Discriminant<kind extends DiscriminantKind = DiscriminantKind> =
    Readonly<{
        readonly path: string[]
        readonly kind: kind
        readonly cases: DiscriminatedCases<kind>
        // TODO: add default here?
        readonly isPureRootLiteral: boolean
    }>

export type DiscriminatedCases<
    kind extends DiscriminantKind = DiscriminantKind
> = Readonly<{
    [caseKey in CaseKey<kind>]: Discriminant | PredicateNode[]
}>

type DiscriminantKey = `${SerializedPath}${DiscriminantKind}`

type CasesBySpecifier = {
    [k in DiscriminantKey]?: Record<string, PredicateNode[]>
}

export type DiscriminantKinds = {
    domain: Domain
    value: SerializedPrimitive
}

const discriminantKinds: keySet<DiscriminantKind> = {
    domain: true,
    value: true
}

export type DiscriminantKind = evaluate<keyof DiscriminantKinds>

const parseDiscriminantKey = (key: DiscriminantKey) => {
    const lastPathIndex = key.lastIndexOf("]")
    return [
        JSON.parse(key.slice(0, lastPathIndex + 1)),
        key.slice(lastPathIndex + 1)
    ] as [path: string[], kind: DiscriminantKind]
}

const discriminantCache = new Map<
    readonly PredicateNode[],
    Discriminant | null
>()

export const discriminate = (
    branches: readonly PredicateNode[]
): Discriminant | null => {
    if (branches.length < 2) {
        return null
    }
    const cached = discriminantCache.get(branches)
    if (cached !== undefined) {
        return cached
    }
    const pureValueBranches = branches.flatMap((branch) =>
        branch.value ? branch.value : []
    )
    if (pureValueBranches.length === branches.length) {
        const cases: DiscriminatedCases = transform(
            pureValueBranches,
            ([i, valueNode]) => [valueNode.serialized, [branches[i]]]
        )
        return {
            path: [],
            kind: "value",
            cases,
            isPureRootLiteral: true
        }
    }
    const casesBySpecifier: CasesBySpecifier = {}
    for (let lIndex = 0; lIndex < branches.length - 1; lIndex++) {
        const l = branches[lIndex]
        for (let rIndex = lIndex + 1; rIndex < branches.length; rIndex++) {
            const r = branches[rIndex]
            const result = l.intersect(r)
            if (!(result instanceof Disjoint)) {
                continue
            }
            for (const { path, kind, disjoint } of result.flat) {
                if (!isKeyOf(kind, discriminantKinds)) {
                    continue
                }
                const qualifiedDiscriminant: DiscriminantKey = `${path}${kind}`
                let lSerialized: string
                let rSerialized: string
                if (kind === "domain") {
                    lSerialized = (disjoint.l as BasisNode).domain
                    rSerialized = (disjoint.r as BasisNode).domain
                } else if (kind === "value") {
                    lSerialized = (disjoint.l as UnitNode).serialized
                    rSerialized = (disjoint.r as UnitNode).serialized
                } else {
                    return throwInternalError(
                        `Unexpected attempt to discriminate disjoint kind '${kind}'`
                    )
                }
                if (!casesBySpecifier[qualifiedDiscriminant]) {
                    casesBySpecifier[qualifiedDiscriminant] = {
                        [lSerialized]: [l],
                        [rSerialized]: [r]
                    }
                    continue
                }
                const cases = casesBySpecifier[qualifiedDiscriminant]!
                if (!isKeyOf(lSerialized, cases)) {
                    cases[lSerialized] = [l]
                } else if (!cases[lSerialized].includes(l)) {
                    cases[lSerialized].push(l)
                }
                if (!isKeyOf(rSerialized, cases)) {
                    cases[rSerialized] = [r]
                } else if (!cases[rSerialized].includes(r)) {
                    cases[rSerialized].push(r)
                }
            }
        }
    }
    // TODO: determinstic? Update cache key?
    const bestDiscriminantEntry = entriesOf(casesBySpecifier)
        .sort((a, b) => Object.keys(a[1]).length - Object.keys(b[1]).length)
        .at(-1)
    if (!bestDiscriminantEntry) {
        discriminantCache.set(branches, null)
        return null
    }
    const [specifier, predicateCases] = bestDiscriminantEntry
    const [path, kind] = parseDiscriminantKey(specifier)
    const cases: mutable<DiscriminatedCases> = {}
    for (const k in predicateCases) {
        const subdiscriminant = discriminate(predicateCases[k])
        cases[k] = subdiscriminant ?? predicateCases[k]
    }
    const discriminant: Discriminant = {
        kind,
        path,
        cases,
        isPureRootLiteral: false
    }
    discriminantCache.set(branches, discriminant)
    return discriminant
}

// TODO: if deeply includes morphs?
export const writeUndiscriminatableMorphUnionMessage = <path extends string>(
    path: path
) =>
    `${
        path === "/" ? "A" : `At ${path}, a`
    } union including one or more morphs must be discriminatable`
