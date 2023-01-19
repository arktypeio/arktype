import type { ScopeRoot } from "../scope.ts"
import type { Domain, Subdomain } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type { constructor, Dict, mutable } from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import { stringSerialize } from "../utils/serialize.ts"
import type { Condition } from "./predicate.ts"
import type { Bound } from "./rules/range.ts"
import { writeEmptyRangeMessage } from "./rules/range.ts"

export type SetOperation<t> = (
    l: t,
    r: t,
    context: OperationContext
) => SetOperationResult<t>

type allowUndefinedOperands<f extends SetOperation<any>> =
    f extends SetOperation<infer operand>
        ? SetOperation<operand | undefined>
        : never

export const composeIntersection = <
    t,
    reducer extends SetOperation<t> = SetOperation<t>
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

const throwUndefinedOperandsError = () =>
    throwInternalError(`Unexpected intersection of two undefined operands`)

export type SetOperationResult<t> = t | Empty | Equal

export type DisjointKinds = {
    domain: [Domain[], Domain[]]
    subdomain: [Subdomain, Subdomain]
    range: [min: Bound, max: Bound]
    class: [constructor, constructor]
    tupleLength: [number, number]
    value: [unknown, Condition]
}

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

export type DisjointKind = keyof DisjointKinds

export type OperationContext = {
    $: ScopeRoot
    path: string
    disjoints: DisjointsByPath
}

export const empty = Symbol("empty")

export type Empty = typeof empty

export const disjoint = <kind extends DisjointKind>(
    kind: kind,
    operands: DisjointKinds[kind],
    context: OperationContext
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

export type KeyReducerMap<root extends Dict> = {
    [k in keyof root]-?: SetOperation<root[k]>
}

export type KeyReducerFn<root extends Dict> = <key extends keyof root>(
    key: key,
    l: root[key],
    r: root[key],
    context: OperationContext
) => SetOperationResult<root[key]>

export type KeyReducer<root extends Dict> =
    | KeyReducerFn<root>
    | KeyReducerMap<root>

export type KeyedOperationConfig = {
    onEmpty: "delete" | "bubble" | "throw"
}

export const composeKeyedOperation =
    <root extends Dict>(
        reducer: KeyReducer<root>,
        config: KeyedOperationConfig
    ): SetOperation<root> =>
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
                if (config.onEmpty === "delete") {
                    delete result[k]
                    lImpliesR = false
                    rImpliesL = false
                } else if (config.onEmpty === "bubble") {
                    return empty
                } else {
                    return throwInternalError(
                        `Unexpected empty operation result at key '${k}'`
                    )
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
