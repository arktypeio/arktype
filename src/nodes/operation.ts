import type { ScopeRoot } from "../scope.js"
import type { Dictionary, mutable } from "../utils/generics.js"
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

export type SetOperation<t> = (l: t, r: t) => SetOperationResult<t>

export type ContextualSetOperation<t, context> = (
    l: t,
    r: t,
    context: context
) => SetOperationResult<t>

export type SetOperationResult<t> = t | empty | equivalence

export const empty = Symbol("empty")

export type empty = typeof empty

export const equivalence = Symbol("equivalent")

export type equivalence = typeof equivalence

export type KeyOperationReducerMap<root extends Dictionary, context> = {
    [k in keyof root]-?: ContextualSetOperation<root[k], context>
}

type definedPropOf<root extends Dictionary> = Required<root>[keyof root]

export type KeyedContextualSetOperation<root extends Dictionary, context> = (
    key: keyof root,
    l: definedPropOf<root>,
    r: definedPropOf<root>,
    context: context
) => SetOperationResult<definedPropOf<root>>

export type RootIntersectionReducer<root extends Dictionary, context> =
    | KeyOperationReducerMap<Required<root>, context>
    | KeyedContextualSetOperation<root, context>

export const composeKeyedOperation =
    <root extends Dictionary, context>(
        operator: "&" | "|",
        reducer: RootIntersectionReducer<root, context>
    ): ContextualSetOperation<root, context> =>
    (l, r, context) => {
        const result: mutable<root> = { ...l, ...r }
        let lImpliesR = true
        let rImpliesL = true
        let k: keyof root
        for (k in result) {
            if (l[k] === undefined) {
                if (operator === "|") {
                    result[k] = r[k]
                    rImpliesL = false
                } else {
                    lImpliesR = false
                }
            }
            if (r[k] === undefined) {
                if (operator === "|") {
                    result[k] = l[k]
                    lImpliesR = false
                } else {
                    rImpliesL = false
                }
            }
            const keyResult =
                typeof reducer === "function"
                    ? reducer(k, l[k], r[k], context)
                    : reducer[k](l[k], r[k], context)
            if (keyResult === equivalence) {
                result[k] = l[k]
            } else if (keyResult === empty) {
                if (operator === "&") {
                    // TODO : Case for optional props
                    return empty
                }
                delete result[k]
                lImpliesR = false
                rImpliesL = false
            } else {
                result[k] = keyResult
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

export const composeNodeOperation =
    (
        resolutionOperation: ContextualSetOperation<BaseResolution, ScopeRoot>
    ): ContextualSetOperation<BaseNode, ScopeRoot> =>
    (l, r, scope) => {
        const lResolution = resolveIfIdentifier(l, scope)
        const rResolution = resolveIfIdentifier(r, scope)
        const result = resolutionOperation(lResolution, rResolution, scope)
        return result === lResolution ? l : result === rResolution ? r : result
    }

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
