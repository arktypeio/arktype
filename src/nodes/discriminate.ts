import type { Domain } from "../utils/domains.js"
import { throwInternalError } from "../utils/errors.js"
import type { evaluate } from "../utils/generics.js"
import type { keySet } from "../utils/records.js"
import { entriesOf, isKeyOf } from "../utils/records.js"
import type { SerializedPrimitive } from "../utils/serialize.js"
import type { BasisDefinition } from "./basis/basis.js"
import type { ValueNode } from "./basis/value.js"
import { compileSerializedValue, In } from "./compilation.js"
import type { QualifiedDisjoint } from "./disjoint.js"
import { Disjoint, parseQualifiedDisjoint } from "./disjoint.js"
import { type PredicateNode, unknownPredicateNode } from "./predicate.js"
import { TypeNode } from "./type.js"

export type CaseKey<kind extends DiscriminantKind = DiscriminantKind> =
    DiscriminantKind extends kind ? string : DiscriminantKinds[kind] | "default"

export type Discriminant<kind extends DiscriminantKind = DiscriminantKind> = {
    readonly path: string
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

export const discriminate = (
    branches: PredicateNode[]
): Discriminant | undefined => {
    if (branches.length < 2) {
        return
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
                    lSerialized = (disjointAtPath.l as BasisDefinition).domain
                    rSerialized = (disjointAtPath.r as BasisDefinition).domain
                } else if (kind === "value") {
                    lSerialized = compileSerializedValue(
                        (disjointAtPath.l as ValueNode).rule
                    )
                    rSerialized = compileSerializedValue(
                        (disjointAtPath.r as ValueNode).rule
                    )
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
        return
    }
    const [specifier, predicateCases] = bestDiscriminantEntry
    const [path, kind] = parseQualifiedDisjoint(specifier)
    // TODO: fix s
    const pathList = path === In ? [] : path.replace(`${In}.`, "").split(".")
    const discriminatedCases: DiscriminatedCases = {}
    for (const k in predicateCases) {
        let caseBranches: PredicateNode[] = []
        for (const branch of predicateCases[k]) {
            const pruned = branch.pruneDiscriminant(pathList, kind)
            if (pruned === null) {
                caseBranches = [unknownPredicateNode]
                break
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
