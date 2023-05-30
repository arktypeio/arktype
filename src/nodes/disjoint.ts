import { throwInternalError, throwParseError } from "../utils/errors.js"
import {
    entriesOf,
    type entryOf,
    fromEntries,
    keysOf
} from "../utils/records.js"
import { stringify } from "../utils/serialize.js"
import type { BasisDefinition } from "./basis/basis.js"
import type { ClassNode } from "./basis/class.js"
import type { ValueNode } from "./basis/value.js"
import type { RangeNode } from "./constraints/range.js"
import type { PredicateNode } from "./predicate.js"
import type { TypeNode } from "./type.js"

type DisjointKinds = {
    domain?: {
        l: BasisDefinition
        r: BasisDefinition
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

export type PathString = `[${string}]`

export type DisjointsSources = {
    [k in `${PathString}`]: DisjointsAtPath
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
        return new Disjoint(fromEntries(entries))
    }

    describeReasons() {
        const reasons = entriesOf(this.sources).flatMap((entry) => {
            const [serializedPath, disjointsAtPath] = entry
            const segments = JSON.parse(serializedPath) as string[]
            const path = segments.join(".")
            const kinds = keysOf(disjointsAtPath)
            return kinds.map(
                (kind) =>
                    `${path && `${path}: `} ${disjointsAtPath[kind]!.l} and ${
                        disjointsAtPath[kind]!.r
                    }`
            )
        })
        if (reasons.length === 1) {
            return reasons[0]
        }
        return `The following intersections result in unsatisfiable types:\n• ${reasons.join(
            "\n• "
        )}`
    }

    throw() {
        return throwParseError(this.describeReasons())
    }

    invert() {
        const inverted: DisjointsSources = {}
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
            disjoints[`${location}:${kind}`] = this.sources[path] as never
        }
        return new Disjoint(disjoints)
    }

    toString() {
        return stringify(this.sources)
    }
}
