import type { ScopeRoot } from "../scope.ts"
import type { Domain, Subdomain } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type { constructor, Dict, mutable } from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import { stringSerialize } from "../utils/serialize.ts"
import type { Condition } from "./predicate.ts"
import type { Bound, BoundKind } from "./rules/range.ts"

export type Intersector<t> = (
    l: t,
    r: t,
    context: IntersectionContext
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
    ((l, r, context) =>
        l === undefined
            ? r === undefined
                ? throwUndefinedOperandsError()
                : r
            : r === undefined
            ? l
            : reducer(l, r, context)) as allowUndefinedOperands<reducer>

export const throwUndefinedOperandsError = () =>
    throwInternalError(`Unexpected operation two undefined operands`)

export type IntersectionResult<t> = t | Empty | Equal

export type DisjointKinds = {
    domain: [Domain[], Domain[]]
    subdomain: [Subdomain, Subdomain]
    range: [min: Bound, max: Bound]
    class: [constructor, constructor]
    tupleLength: [number, number]
    value: [unknown, Condition]
}

// TODO: add union reason
export const disjointMessageWriters = {
    domain: ({ operands }) =>
        `${operands[0].join(", ")} ${
            operands[0].length > 1 ? "have" : "has"
        } no overlap with ${operands[1].join(", ")}`,
    subdomain: ({ operands }) =>
        `${operands[0]} has no overlap with ${operands[1]}`,
    range: ({ operands }) => writeEmptyRangeMessage(operands[0], operands[1]),
    class: ({ operands }) =>
        `${operands[0].name} has no overlap with ${operands[1].name}`,
    tupleLength: ({ operands }) =>
        `Tuple of length ${operands[0]} has no overlap with tuple of length ${operands[1]}`,
    value: ({ operands }) =>
        `Literal value ${stringSerialize(
            operands[0]
        )} has no overlap with ${stringSerialize(operands[1])}`
} satisfies {
    [k in DisjointKind]: (context: DisjointContext<k>) => string
}

export const writeEmptyRangeMessage = (min: Bound, max: Bound) =>
    `the range bounded by ${stringifyBound("min", min)} and ${stringifyBound(
        "max",
        max
    )} is empty`

export const stringifyBound = (kind: BoundKind, bound: Bound) =>
    `${toComparator(kind, bound)}${bound.limit}` as const

export const toComparator = (kind: BoundKind, bound: Bound) =>
    `${kind === "min" ? ">" : "<"}${bound.exclusive ? "" : "="}` as const

export type DisjointKind = keyof DisjointKinds

export type IntersectionContext = {
    $: ScopeRoot
    path: string
    disjoints: DisjointsByPath
}

export const empty = Symbol("empty")

export type Empty = typeof empty

export const disjoint = <kind extends DisjointKind>(
    kind: kind,
    operands: DisjointKinds[kind],
    context: IntersectionContext
): Empty => {
    context.disjoints[context.path] = {
        kind,
        operands
    }
    return empty
}

export const isDisjoint = (result: unknown): result is Empty => result === empty

export type DisjointsByPath = Record<string, DisjointContext>

export type DisjointContext<kind extends DisjointKind = DisjointKind> = {
    kind: kind
    operands: DisjointKinds[kind]
}

const equal = Symbol("equal")

export type Equal = typeof equal

export const equality = (): Equal => equal

export const isEquality = (result: unknown): result is Equal => result === equal

export type IntersectionReducerMap<root extends Dict> = {
    [k in keyof root]-?: Intersector<root[k]>
}

export type KeyReducerFn<
    root extends Dict,
    includeSetResults extends boolean
> = <key extends keyof root>(
    key: key,
    l: root[key],
    r: root[key],
    context: IntersectionContext
) => includeSetResults extends true ? IntersectionResult<root[key]> : root[key]

export type IntersectionReducer<root extends Dict> =
    | KeyReducerFn<root, true>
    | IntersectionReducerMap<root>

export type KeyedOperationConfig = {
    onEmpty: "delete" | "bubble"
}

export const composeKeyedIntersection =
    <root extends Dict>(
        reducer: IntersectionReducer<root>,
        config: KeyedOperationConfig
    ): Intersector<root> =>
    (l, r, context) => {
        const result = {} as mutable<root>
        const keys = keysOf({ ...l, ...r } as root)
        let lImpliesR = true
        let rImpliesL = true
        for (const k of keys) {
            const keyResult =
                typeof reducer === "function"
                    ? reducer(k, l[k], r[k], context)
                    : reducer[k](l[k], r[k], context)
            if (isEquality(keyResult)) {
                result[k] = l[k]
            } else if (isDisjoint(keyResult)) {
                if (config.onEmpty === "delete") {
                    delete result[k]
                    lImpliesR = false
                    rImpliesL = false
                } else {
                    return empty
                }
            } else {
                result[k] = keyResult
                lImpliesR &&= keyResult === l[k]
                rImpliesL &&= keyResult === r[k]
            }
        }
        return lImpliesR ? (rImpliesL ? equality() : l) : rImpliesL ? r : result
    }
