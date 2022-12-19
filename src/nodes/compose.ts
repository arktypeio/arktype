import type { ScopeRoot } from "../scope.js"
import { throwInternalError } from "../utils/errors.js"
import type { Dictionary, mutable, stringKeyOf } from "../utils/generics.js"
import { keywords } from "./keywords.js"
import type { TypeNode, TypeSet } from "./node.js"
import { resolveIfIdentifier } from "./utils.js"

type ContextFreeSetOperation<t, result extends t> = (
    l: t,
    r: t
) => SetOperationResult<result>

type ContextualSetOperation<t, context, result extends t> = (
    l: t,
    r: t,
    context: context
) => SetOperationResult<result>

export type SetOperation<
    t,
    context = undefined,
    result extends t = t
> = context extends undefined
    ? ContextFreeSetOperation<t, result>
    : ContextualSetOperation<t, context, result>

type allowUndefinedOperands<f extends SetOperation<any, any>> =
    f extends SetOperation<infer operand, infer context>
        ? SetOperation<
              operand | undefined,
              unknown extends context ? undefined : context,
              operand
          >
        : never

export const composeIntersection = <
    t,
    context = undefined,
    reducer extends SetOperation<t, context> = SetOperation<t, context>
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

export type SetOperationResult<t> = t | empty | equal

export const empty = Symbol("empty")

export type empty = typeof empty

export const equal = Symbol("equal")

export type equal = typeof equal

export type KeyReducerMap<root extends Dictionary, context> = {
    [k in keyof root]-?: SetOperation<root[k], context>
}

export type KeyReducerFn<root extends Dictionary, context> = <
    key extends keyof root
>(
    key: key,
    l: root[key],
    r: root[key],
    context: context
) => SetOperationResult<root[key]>

export type KeyReducer<root extends Dictionary, context> =
    | KeyReducerFn<root, context>
    | KeyReducerMap<root, context>

export type KeyedOperationConfig = {
    onEmpty: "delete" | "bubble" | "throw"
}

export const composeKeyedOperation =
    <root extends Dictionary, context>(
        reducer: KeyReducer<root, context>,
        config: KeyedOperationConfig
    ): ContextualSetOperation<root, context, root> =>
    (l, r, context) => {
        const result = {} as mutable<root>
        const keys: stringKeyOf<root>[] = Object.keys({ ...l, ...r })
        let lImpliesR = true
        let rImpliesL = true
        for (const k of keys) {
            const keyResult =
                typeof reducer === "function"
                    ? reducer(k, l[k], r[k], context)
                    : reducer[k](l[k], r[k], context)
            if (keyResult === equal) {
                if (l[k] !== undefined) {
                    result[k] = l[k]
                }
            } else if (keyResult === empty) {
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
        return lImpliesR ? (rImpliesL ? equal : l) : rImpliesL ? r : result
    }

export const composeNodeOperation =
    (
        typeSetOperation: SetOperation<TypeSet, ScopeRoot>
    ): SetOperation<TypeNode, ScopeRoot> =>
    (l, r, scope) => {
        const lResolution = resolveIfIdentifier(l, scope)
        const rResolution = resolveIfIdentifier(r, scope)
        const result = typeSetOperation(lResolution, rResolution, scope)
        return result === lResolution ? l : result === rResolution ? r : result
    }

export const finalizeNodeOperation = (
    l: TypeNode,
    result: SetOperationResult<TypeNode>
): TypeNode =>
    result === empty ? keywords.never : result === equal ? l : result
