import type { Domain } from "../utils/domains.js"
import { throwInternalError } from "../utils/errors.js"
import type { evaluate } from "../utils/generics.js"
import type { keySet } from "../utils/records.js"
import { entriesOf, isKeyOf } from "../utils/records.js"
import type { SerializedPrimitive } from "../utils/serialize.js"
import type { BasisNode } from "./basis.js"
import type { QualifiedDisjoint } from "./disjoint.js"
import { Disjoint, parseQualifiedDisjoint } from "./disjoint.js"
import type { PredicateNode } from "./predicate.js"
import { getUnknown, TypeNode } from "./type.js"
import { type CompiledPath, In } from "./utils.js"

export type CaseKey<kind extends DiscriminantKind = DiscriminantKind> =
    DiscriminantKind extends kind ? string : DiscriminantKinds[kind] | "default"

export type DiscriminatedBranches = TypeNode | Discriminant

export type Discriminant<kind extends DiscriminantKind = DiscriminantKind> = {
    readonly path: CompiledPath
    readonly kind: kind
    readonly cases: DiscriminatedCases<kind>
}

export type DiscriminatedCases<
    kind extends DiscriminantKind = DiscriminantKind
> = {
    [caseKey in CaseKey<kind>]: TypeNode
}

type CasesBySpecifier = {
    [k in QualifiedDisjoint<DiscriminantKind>]?: Record<string, PredicateNode[]>
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

export const discriminate = (node: TypeNode): DiscriminatedBranches => {
    const branches = node.branches
    if (branches.length === 0 || branches.length === 1) {
        return node
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
            let specifier: QualifiedDisjoint
            for (specifier in result.sources) {
                const kind = parseQualifiedDisjoint(specifier)[1]
                const disjointAtPath = result.sources[specifier]!
                if (!isKeyOf(kind, discriminantKinds)) {
                    continue
                }
                const qualifiedDiscriminant =
                    specifier as QualifiedDisjoint<DiscriminantKind>
                let lSerialized: string
                let rSerialized: string
                if (kind === "domain") {
                    lSerialized = (disjointAtPath.l as BasisNode).domain
                    rSerialized = (disjointAtPath.r as BasisNode).domain
                } else if (kind === "value") {
                    lSerialized = (disjointAtPath.l as BasisNode<"value">)
                        .serializedValue
                    rSerialized = (disjointAtPath.r as BasisNode<"value">)
                        .serializedValue
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
    const bestDiscriminantEntry = entriesOf(casesBySpecifier)
        .sort((a, b) => Object.keys(a[1]).length - Object.keys(b[1]).length)
        .at(-1)
    if (!bestDiscriminantEntry) {
        return node
    }
    const [specifier, predicateCases] = bestDiscriminantEntry
    const [path, kind] = parseQualifiedDisjoint(specifier)
    // TODO: fix s
    const pathList = path === In ? [] : path.replace(`${In}.`, "").split(".")
    const discriminatedCases: DiscriminatedCases = {}
    for (const k in predicateCases) {
        const caseBranches = []
        for (const branch of predicateCases[k]) {
            const pruned = branch.pruneDiscriminant(pathList, kind)
            if (pruned === null) {
                return getUnknown()
            }
            caseBranches.push(pruned)
        }
        discriminatedCases[k] = new TypeNode(caseBranches)
    }

    return {
        kind,
        path,
        cases: discriminatedCases
    }
}

export const writeUndiscriminatableMorphUnionMessage = <path extends string>(
    path: path
) =>
    `${
        path === "/" ? "A" : `At ${path}, a`
    } union including one or more morphs must be discriminatable`
