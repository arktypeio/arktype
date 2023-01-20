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
    value: [unknown, unknown]
    assignability: [unknown, Condition]
}

// TODO: add union
export const disjointDescribers = {
    domain: (operands) =>
        `${operands[0].join(", ")} and ${operands[1].join(", ")}`,
    subdomain: (operands) => `${operands[0]} and ${operands[1]}`,
    range: (operands) =>
        `${stringifyBound("min", operands[0])} and ${stringifyBound(
            "max",
            operands[1]
        )}`,
    class: (operands) => `classes ${operands[0].name} and ${operands[1].name}`,
    tupleLength: (operands) =>
        `tuples of length ${operands[0]} and ${operands[1]}`,
    value: (operands) =>
        `literal values ${stringSerialize(operands[0])} and ${stringSerialize(
            operands[1]
        )}`,
    assignability: (operands) =>
        `literal value ${stringSerialize(operands[0])} and ${stringSerialize(
            operands[1]
        )}`
} satisfies {
    [k in DisjointKind]: (context: DisjointContext<k>["operands"]) => string
}

// TODO: move
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

export type KeyIntersectionFn<root extends Dict> = <key extends keyof root>(
    key: key,
    l: root[key],
    r: root[key],
    context: IntersectionContext
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
