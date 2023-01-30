import type { ParseContext } from "../parse/definition.ts"
import type { Morph } from "../parse/tuple/morph.ts"
import type { Domain, Subdomain } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type {
    CollapsibleList,
    constructor,
    Dict,
    extend,
    mutable
} from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import { Path } from "../utils/paths.ts"
import { serialize } from "../utils/serialize.ts"
import type { Bound, BoundKind, Range } from "./rules/range.ts"
import type { LiteralRules, NarrowableRules } from "./rules/rules.ts"

export type Intersector<t> = (
    l: t,
    r: t,
    state: IntersectionState
) => IntersectionResult<t>

type allowUndefinedOperands<f extends Intersector<any>> = f extends Intersector<
    infer operand
>
    ? Intersector<operand | undefined>
    : never

export const composeIntersection = <
    t,
    reducer extends Intersector<t> = Intersector<t>
>(
    reducer: reducer
) =>
    ((l, r, state) =>
        l === undefined
            ? r === undefined
                ? throwUndefinedOperandsError()
                : r
            : r === undefined
            ? l
            : reducer(l, r, state)) as allowUndefinedOperands<reducer>

export const throwUndefinedOperandsError = () =>
    throwInternalError(`Unexpected operation two undefined operands`)

export type IntersectionResult<t> = t | Empty | Equal

// TODO: add union
export type DisjointKinds = extend<
    Record<string, { l: unknown; r: unknown }>,
    {
        domain: {
            l: Domain[]
            r: Domain[]
        }
        subdomain: {
            l: Subdomain
            r: Subdomain
        }
        range: {
            l: Range
            r: Range
        }
        class: {
            l: constructor
            r: constructor
        }
        tupleLength: {
            l: number
            r: number
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
        morph: {
            l: CollapsibleList<Morph>
            r: CollapsibleList<Morph>
        }
    }
>

export const disjointDescriptionWriters = {
    domain: ({ l, r }) => `${l.join(", ")} and ${r.join(", ")}`,
    subdomain: ({ l, r }) => `${l} and ${r}`,
    range: ({ l, r }) => `${stringifyRange(l)} and ${stringifyRange(r)}`,
    class: ({ l, r }) => `classes ${l.name} and ${r.name}`,
    tupleLength: ({ l, r }) => `tuples of length ${l} and ${r}`,
    value: ({ l, r }) => `literal values ${serialize(l)} and ${serialize(r)}`,
    leftAssignability: ({ l, r }) =>
        `literal value ${serialize(l.value)} and ${serialize(r)}`,
    rightAssignability: ({ l, r }) =>
        `literal value ${serialize(r.value)} and ${serialize(l)}`,
    morph: () => "morphs"
} satisfies {
    [k in DisjointKind]: (context: DisjointContext<k>) => string
}

// TODO: move
export const writeEmptyRangeMessage = (min: Bound, max: Bound) =>
    `${stringifyRange({ min, max })} is empty`

export const stringifyRange = (range: Range) =>
    range.min
        ? range.max
            ? `the range bounded by ${stringifyBound(
                  "min",
                  range.min
              )} and ${stringifyBound("max", range.max)}`
            : stringifyBound("min", range.min)
        : range.max
        ? stringifyBound("max", range.max)
        : "unbounded range"

export const stringifyBound = (kind: BoundKind, bound: Bound) =>
    `${toComparator(kind, bound)}${bound.limit}` as const

export const toComparator = (kind: BoundKind, bound: Bound) =>
    `${kind === "min" ? ">" : "<"}${bound.exclusive ? "" : "="}` as const

export type DisjointKind = keyof DisjointKinds

export class IntersectionState {
    path = new Path()
    #morphs: MorphsByPath = {}
    #disjoints: DisjointsByPath = {}

    constructor(public ctx: ParseContext) {}

    get disjoints() {
        return this.#disjoints as Readonly<DisjointsByPath>
    }

    addDisjoint<kind extends DisjointKind>(
        kind: kind,
        l: DisjointKinds[kind]["l"],
        r: DisjointKinds[kind]["r"]
    ): Empty {
        this.#disjoints[`${this.path}`] = { kind, l, r }
        return empty
    }

    addMorph(kind: MorphIntersectionKind) {
        this.#morphs[`${this.path}`] = kind
    }

    get morphs() {
        return this.#morphs as Readonly<MorphsByPath>
    }
}

export type DisjointsByPath = Record<string, DisjointContext>

export type DisjointContext<kind extends DisjointKind = DisjointKind> = {
    kind: kind
} & DisjointKinds[kind]

export type MorphsByPath = Record<string, MorphIntersectionKind>

export type MorphIntersectionKind = "l" | "r" | "=" | "lr"

const empty = Symbol("empty")

export type Empty = typeof empty

export const anonymousDisjoint = (): Empty => empty

export const isDisjoint = (result: unknown): result is Empty => result === empty

const equal = Symbol("equal")

export type Equal = typeof equal

export const equality = (): Equal => equal

export const isEquality = (result: unknown): result is Equal => result === equal

export type IntersectionReducerMap<root extends Dict> = {
    [k in keyof root]-?: Intersector<root[k]>
}

export type KeyIntersectionFn<root extends Dict> = <key extends keyof root>(
    key: key,
    l: root[key],
    r: root[key],
    state: IntersectionState
) => IntersectionResult<root[key]>

export type IntersectionReducer<root extends Dict> =
    | KeyIntersectionFn<root>
    | IntersectionReducerMap<root>

export type KeyedOperationConfig = {
    onEmpty: "omit" | "bubble"
}

export const composeKeyedIntersection =
    <root extends Dict>(
        reducer: IntersectionReducer<root>,
        config: KeyedOperationConfig
    ): Intersector<root> =>
    (l, r, state) => {
        const result = {} as mutable<root>
        const keys = keysOf({ ...l, ...r } as root)
        let lImpliesR = true
        let rImpliesL = true
        for (const k of keys) {
            const keyResult =
                typeof reducer === "function"
                    ? reducer(k, l[k], r[k], state)
                    : reducer[k](l[k], r[k], state)
            if (isEquality(keyResult)) {
                if (l[k] !== undefined) {
                    result[k] = l[k]
                }
            } else if (isDisjoint(keyResult)) {
                if (config.onEmpty === "omit") {
                    lImpliesR = false
                    rImpliesL = false
                } else {
                    return empty
                }
            } else {
                if (keyResult !== undefined) {
                    result[k] = keyResult
                }
                lImpliesR &&= keyResult === l[k]
                rImpliesL &&= keyResult === r[k]
            }
        }
        return lImpliesR ? (rImpliesL ? equality() : l) : rImpliesL ? r : result
    }
