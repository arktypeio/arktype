import type { Domain } from "../utils/domains.js"
import { throwInternalError } from "../utils/errors.js"
import type { constructor, entryOf } from "../utils/generics.js"
import { stringify } from "../utils/serialize.js"
import type { BasisNode } from "./basis.js"
import type { PredicateNode } from "./predicate.js"
import type { RangeNode } from "./range.js"
import type { TypeNode } from "./type.js"
import type { CompiledPath } from "./utils.js"
import { insertInitialPropAccess } from "./utils.js"

type DisjointKinds = {
    domain?: {
        l: BasisNode
        r: BasisNode
    }
    value?: {
        l: BasisNode<"value">
        r: BasisNode<"value">
    }
    range?: {
        l: RangeNode
        r: RangeNode
    }
    class?: {
        l: BasisNode<"class">
        r: BasisNode<"class">
    }
    assignability?:
        | {
              l: BasisNode<"value">
              r: PredicateNode
          }
        | {
              l: PredicateNode
              r: BasisNode<"value">
          }
    union?: {
        l: TypeNode
        r: TypeNode
    }
}

export const parseQualifiedDisjoint = <
    kind extends DisjointKind = DisjointKind
>(
    qualifiedDisjoint: QualifiedDisjoint<kind>
) => {
    const splitIndex = qualifiedDisjoint.lastIndexOf(":")
    return [
        qualifiedDisjoint.slice(0, splitIndex),
        qualifiedDisjoint.slice(splitIndex + 1)
    ] as [path: CompiledPath, kind: kind]
}

export type DisjointKindEntries = entryOf<DisjointKinds>[]

export type QualifiedDisjoint<kind extends DisjointKind = DisjointKind> =
    `${CompiledPath}:${kind}`

export type DisjointsSources = {
    [k in QualifiedDisjoint]: k extends QualifiedDisjoint<infer kind>
        ? DisjointKinds[kind]
        : never
}

export type DisjointKind = keyof DisjointKinds

export class Disjoint {
    constructor(public sources: DisjointsSources) {}

    static from<kind extends DisjointKind>(
        kind: kind,
        l: Required<DisjointKinds>[kind]["l"],
        r: Required<DisjointKinds>[kind]["r"]
    ) {
        return new Disjoint({
            [`$arkIn:${kind}`]: {
                l,
                r
            } as never
        })
    }

    static fromEntries(entries: DisjointKindEntries) {
        if (!entries.length) {
            return throwInternalError(
                `Unexpected attempt to create a disjoint from no entries`
            )
        }
        const byPath: DisjointsSources = {}
        for (const [kind, operands] of entries) {
            byPath[`$arkIn:${kind}`] = operands as never
        }
        return new Disjoint(byPath)
    }

    invert() {
        const inverted: DisjointsSources = {}
        let path: QualifiedDisjoint
        for (path in this.sources) {
            inverted[path] = {
                l: this.sources[path]!.r as never,
                r: this.sources[path]!.l as never
            }
        }
        return new Disjoint(inverted)
    }

    withPrefixKey(key: string) {
        const disjoints: DisjointsSources = {}
        let path: QualifiedDisjoint
        for (path in this.sources) {
            const [location, kind] = parseQualifiedDisjoint(path)
            const locationWithKey = insertInitialPropAccess(location, key)
            disjoints[`${locationWithKey}:${kind}`] = this.sources[
                path
            ] as never
        }
        return new Disjoint(disjoints)
    }

    toString() {
        return stringify(this.sources)
    }
}
