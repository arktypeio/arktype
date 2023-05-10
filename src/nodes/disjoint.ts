import { throwInternalError, throwParseError } from "../utils/errors.js"
import { entriesOf, type entryOf } from "../utils/records.js"
import { stringify } from "../utils/serialize.js"
import type { BasisNode } from "./basis.js"
import { In, prependKey } from "./compilation.js"
import type { PredicateNode } from "./predicate.js"
import type { RangeNode } from "./range.js"
import type { TypeNode } from "./type.js"

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
    ] as [path: string, kind: kind]
}

export type DisjointKindEntries = entryOf<DisjointKinds>[]

export type QualifiedDisjoint<kind extends DisjointKind = DisjointKind> =
    `${string}:${kind}`

export type DisjointsSources = {
    [k in QualifiedDisjoint]: k extends QualifiedDisjoint<infer kind>
        ? Required<DisjointKinds>[kind]
        : never
}

export type DisjointSourceEntry = entryOf<DisjointsSources>

export type DisjointKind = keyof DisjointKinds

export class Disjoint {
    constructor(public sources: DisjointsSources) {}

    static from<kind extends DisjointKind>(
        kind: kind,
        l: Required<DisjointKinds>[kind]["l"],
        r: Required<DisjointKinds>[kind]["r"]
    ) {
        return new Disjoint({
            [`${In}:${kind}`]: {
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
            byPath[`${In}:${kind}`] = operands as never
        }
        return new Disjoint(byPath)
    }

    describeReasons() {
        const entries = entriesOf(this.sources)
        if (entries.length === 1) {
            const entry = entries[0]
            const path = parseQualifiedDisjoint(entry[0])[0]
            return `Intersection${path && ` at ${path}`} of ${entry[1].l} and ${
                entry[1].r
            } results in an unsatisfiable type`
        }
        const reasons = entriesOf(this.sources).map((entry) => {
            const [path] = parseQualifiedDisjoint(entry[0])
            return `${path && `${path}: `} ${entry[1].l} and ${entry[1].r}`
        })
        return `The following intersections result in unsatisfiable types:\n• ${reasons.join(
            "\n• "
        )}`
    }

    throw() {
        return throwParseError(this.describeReasons())
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
            const locationWithKey = prependKey(location, key)
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
