import {
    stringify,
    throwInternalError,
    throwParseError
} from "../../dev/utils/src/main.js"
import {
    entriesOf,
    type entryOf,
    fromEntries
} from "../../dev/utils/src/main.js"
import type { PredicateNode } from "./composite/predicate.js"
import type { TypeNode } from "./composite/type.js"
import type { BasisNode } from "./primitive/basis/basis.js"
import type { ClassNode } from "./primitive/basis/class.js"
import type { ValueNode } from "./primitive/basis/value.js"
import type { RangeNode } from "./primitive/range.js"

type DisjointKinds = {
    domain?: {
        l: BasisNode
        r: BasisNode
    }
    value?: {
        l: ValueNode
        r: ValueNode
    }
    range?: {
        l: RangeNode
        r: RangeNode
    }
    class?: {
        l: ClassNode
        r: ClassNode
    }
    assignability?:
        | {
              l: ValueNode
              r: PredicateNode
          }
        | {
              l: PredicateNode
              r: ValueNode
          }
    union?: {
        l: TypeNode
        r: TypeNode
    }
}

export type DisjointKindEntries = entryOf<DisjointKinds>[]

export type SerializedPath = `[${string}]`

export type DisjointsSources = {
    [k in `${SerializedPath}`]: DisjointsAtPath
}

export type DisjointsAtPath = {
    [kind in DisjointKind]?: DisjointKinds[kind]
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
            "[]": {
                [kind]: {
                    l,
                    r
                }
            }
        })
    }

    static fromEntries(entries: DisjointKindEntries) {
        if (!entries.length) {
            return throwInternalError(
                `Unexpected attempt to create a disjoint from no entries`
            )
        }
        return new Disjoint({ "[]": fromEntries(entries) })
    }

    get flat() {
        return entriesOf(this.sources).flatMap(([path, disjointKinds]) =>
            entriesOf(disjointKinds).map(([kind, disjoint]) => ({
                path,
                kind,
                disjoint
            }))
        )
    }

    describeReasons() {
        const reasons = this.flat
        if (reasons.length === 1) {
            const { path, disjoint } = reasons[0]
            const pathString = JSON.parse(path).join(".")
            return `Intersection${pathString && ` at ${pathString}`} of ${
                disjoint.l
            } and ${disjoint.r} results in an unsatisfiable type`
        }
        return `The following intersections result in unsatisfiable types:\n• ${reasons
            .map(
                ({ path, disjoint }) =>
                    `${path}: ${disjoint.l} and ${disjoint.r}`
            )
            .join("\n• ")}`
    }

    throw() {
        return throwParseError(this.describeReasons())
    }

    invert() {
        const invertedEntries = entriesOf(this.sources).map(
            ([path, disjoints]): DisjointSourceEntry => [
                path,
                Object.fromEntries(
                    entriesOf(disjoints).map(
                        ([kind, disjoint]) =>
                            [kind, { l: disjoint.r, r: disjoint.l }] as const
                    )
                )
            ]
        )
        return new Disjoint(fromEntries(invertedEntries))
    }

    withPrefixKey(key: string) {
        const entriesWithPrefix = entriesOf(this.sources).map(
            ([path, disjoints]): DisjointSourceEntry => {
                const segments = JSON.parse(path) as string[]
                segments.unshift(key)
                const pathWithPrefix = JSON.stringify(segments) as `[${string}]`
                return [pathWithPrefix, disjoints]
            }
        )
        return new Disjoint(fromEntries(entriesWithPrefix))
    }

    toString() {
        return stringify(this.sources)
    }
}
