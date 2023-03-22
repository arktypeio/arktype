import type { Type } from "../scopes/type.ts"
import type { Domain } from "../utils/domains.ts"
import type { constructor, Dict, extend, mutable } from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import type { DefaultObjectKind } from "../utils/objectKinds.ts"
import { Path } from "../utils/paths.ts"
import { stringify } from "../utils/serialize.ts"
import type { Compilation } from "./compile.ts"
import type { Range } from "./rules/range.ts"
import type { LiteralRules, NarrowableRules } from "./rules/rules.ts"

export type IntersectionResult<t> =
    | {
          result: t
          isSubtype: boolean
          isSupertype: boolean
          isDisjoint: false
      }
    | {
          result: DisjointContext
          isSubtype: false
          isSupertype: false
          isDisjoint: true
      }

export type DisjointKinds = extend<
    Record<string, { l: unknown; r: unknown }>,
    {
        domain: {
            l: Domain[]
            r: Domain[]
        }
        range: {
            l: Range
            r: Range
        }
        tupleLength: {
            l: number
            r: number
        }
        class: {
            l: DefaultObjectKind | constructor
            r: DefaultObjectKind | constructor
        }
        value: {
            l: unknown
            r: unknown
        }
        leftAssignability: {
            l: LiteralRules
            r: NarrowableRules
        }
        rightAssignability: {
            l: NarrowableRules
            r: LiteralRules
        }
        union: {
            l: Branches
            r: Branches
        }
    }
>

export const disjointDescriptionWriters = {
    domain: ({ l, r }) => `${l.join(", ")} and ${r.join(", ")}`,
    range: ({ l, r }) => `${stringifyRange(l)} and ${stringifyRange(r)}`,
    class: ({ l, r }) =>
        `classes ${typeof l === "string" ? l : l.name} and ${
            typeof r === "string" ? r : r.name
        }`,
    tupleLength: ({ l, r }) => `tuples of length ${l} and ${r}`,
    value: ({ l, r }) => `literal values ${stringify(l)} and ${stringify(r)}`,
    leftAssignability: ({ l, r }) =>
        `literal value ${stringify(l.value)} and ${stringify(r)}`,
    rightAssignability: ({ l, r }) =>
        `literal value ${stringify(r.value)} and ${stringify(l)}`,
    union: ({ l, r }) => `branches ${stringify(l)} and branches ${stringify(r)}`
} satisfies {
    [k in DisjointKind]: (context: DisjointContext<k>) => string
}

export const stringifyRange = (range: Range) =>
    "limit" in range
        ? `the range of exactly ${range.limit}`
        : range.min
        ? range.max
            ? `the range bounded by ${range.min.comparator}${range.min.limit} and ${range.max.comparator}${range.max.limit}`
            : `${range.min.comparator}${range.min.limit}`
        : range.max
        ? `${range.max.comparator}${range.max.limit}`
        : "the unbounded range"

export type DisjointKind = keyof DisjointKinds

export class IntersectionState {
    path = new Path()
    domain: Domain | undefined
    #disjoints: DisjointsByPath = {}

    constructor(public type: Type, public lastOperator: "|" | "&") {}

    get disjoints() {
        return this.#disjoints as Readonly<DisjointsByPath>
    }

    addDisjoint<kind extends DisjointKind>(
        kind: kind,
        l: DisjointKinds[kind]["l"],
        r: DisjointKinds[kind]["r"]
    ): IntersectionResult<never> {
        const result = { kind, l, r }
        this.#disjoints[`${this.path}`] = result
        return {
            result,
            isSubtype: false,
            isSupertype: false,
            isDisjoint: true
        }
    }
}

export type DisjointsByPath = Record<string, DisjointContext>

export type DisjointContext<kind extends DisjointKind = DisjointKind> = {
    kind: kind
} & DisjointKinds[kind]
