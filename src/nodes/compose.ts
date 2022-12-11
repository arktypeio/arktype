import type { ScopeRoot } from "../scope.js"
import { throwInternalError } from "../utils/errors.js"
import type { Dictionary, mutable, stringKeyOf } from "../utils/generics.js"
import { listIntersection } from "../utils/generics.js"
import type { TypeName } from "../utils/typeOf.js"
import { keywords } from "./names.js"
import type {
    BaseConstraints,
    BaseKeyedConstraint,
    BaseNode,
    BaseResolution,
    Node
} from "./node.js"
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

type allowUndefinedOperation<
    f extends SetOperation<any, any>,
    requireResult extends boolean = false
> = f extends SetOperation<infer operand, infer context>
    ? SetOperation<
          operand | undefined,
          unknown extends context ? undefined : context,
          requireResult extends true ? operand : operand | undefined
      >
    : never

export const composeBranchIntersection = <
    t,
    context = undefined,
    reducer extends SetOperation<t, context> = SetOperation<t, context>
>(
    reducer: reducer
) =>
    ((l, r, context) =>
        l === undefined
            ? r === undefined
                ? equivalence
                : undefined
            : r === undefined
            ? undefined
            : reducer(l, r, context)) as allowUndefinedOperation<reducer>

export const composeConstraintIntersection = <
    t,
    context = undefined,
    reducer extends SetOperation<t, context> = SetOperation<t, context>
>(
    reducer: reducer
) =>
    ((l, r, context) =>
        l === undefined
            ? r === undefined
                ? throwInternalError(
                      `Unexpected intersection of two undefined constraints`
                  )
                : r
            : r === undefined
            ? l
            : reducer(l, r, context)) as allowUndefinedOperation<reducer, true>

export type SetOperationResult<t> = t | empty | equivalence

export const empty = Symbol("empty")

export type empty = typeof empty

export const equivalence = Symbol("equivalent")

export type equivalence = typeof equivalence

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
    propagateEmpty?: true
}

export const composeKeyedOperation =
    <root extends Dictionary, context>(
        reducer: KeyReducer<root, context>,
        config?: KeyedOperationConfig
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
            if (keyResult === equivalence) {
                if (l[k] !== undefined) {
                    result[k] = l[k]
                }
            } else if (keyResult === empty) {
                if (config?.propagateEmpty) {
                    // TODO: Figure out a final solution for this
                    return empty
                }
                delete result[k]
                lImpliesR = false
                rImpliesL = false
            } else {
                if (keyResult !== undefined) {
                    result[k] = keyResult
                }
                lImpliesR &&= keyResult === l[k]
                rImpliesL &&= keyResult === r[k]
            }
        }
        return lImpliesR
            ? rImpliesL
                ? equivalence
                : l
            : rImpliesL
            ? r
            : result
    }

export const composeNodeOperation = (
    resolutionOperation: SetOperation<BaseResolution, ScopeRoot>
) =>
    composeConstraintIntersection<BaseNode, ScopeRoot>((l, r, scope) => {
        const lResolution = resolveIfIdentifier(l, scope)
        const rResolution = resolveIfIdentifier(r, scope)
        const result = resolutionOperation(lResolution, rResolution, scope)
        return result === lResolution ? l : result === rResolution ? r : result
    })

export const finalizeNodeOperation = (
    l: BaseNode,
    result: SetOperationResult<BaseNode>
): Node =>
    result === empty ? keywords.never : result === equivalence ? l : result

// TODO: Add aliases back if no subtype indices
export const coalesceBranches = (
    typeName: TypeName,
    branches: BaseKeyedConstraint[]
): BaseConstraints => {
    switch (branches.length) {
        case 0:
            // TODO: type is never, anything else that can be done?
            return []
        case 1:
            return branches[0]
        default:
            if (typeName === "boolean") {
                // If a boolean has multiple branches, neither of which is a
                // subtype of the other, it consists of two opposite literals
                // and can be simplified to a non-literal boolean.
                return true
            }
            return branches
    }
}
