import type { ScopeRoot } from "../scope.ts"
import type { Domain, Subdomain } from "../utils/domains.ts"
import { throwInternalError } from "../utils/errors.ts"
import type { constructor, Dict, mutable } from "../utils/generics.ts"
import { keysOf } from "../utils/generics.ts"
import type { Range } from "./rules/range.ts"

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

export type SetOperationResult<t> = t | Disjoint | Equality

export type DisjointKinds = {
    domain: Domain[]
    subdomain: Subdomain
    range: Range
    class: constructor
    value: unknown
    tupleLength: number
}

export type DisjointKind = keyof DisjointKinds

export type OperationContext = {
    $: ScopeRoot
    path: string
    domain: Domain | null
    emptyResults: Record<string, EmptyIntersection>
}

const empty = Symbol("empty")

export type Disjoint = typeof empty

export const disjoint = <kind extends DisjointKind>(
    kind: kind,
    left: DisjointKinds[kind],
    right: DisjointKinds[kind],
    context: OperationContext
): Disjoint => {
    context.emptyResults[context.path] = {
        kind,
        left,
        right
    }
    return empty
}

export const isDisjoint = (result: unknown): result is Disjoint =>
    result === empty

export type EmptyIntersection<kind extends DisjointKind = DisjointKind> = {
    kind: kind
    left: DisjointKinds[kind]
    right: DisjointKinds[kind]
}

const equal = Symbol("equal")

export type Equality = typeof equal

export const equality = (): Equality => equal

export const isEquality = (result: unknown): result is Equality =>
    result === equal

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
