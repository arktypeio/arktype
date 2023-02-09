import { throwInternalError } from "../../utils/errors.js"
import type { Dict, List, mutable } from "../../utils/generics.js"
import type { DefaultObjectKind } from "../../utils/objectKinds.js"
import {
    composeIntersection,
    equality,
    isDisjoint,
    isEquality
} from "../compose.js"
import type { ResolvedNode, TraversalNode, TypeNode } from "../node.js"
import { flattenNode, nodeIntersection } from "../node.js"
import type { FlattenAndPushRule } from "./rules.js"

export type ObjectKindRule<$ = Dict> =
    | DefaultObjectKind
    | readonly ["Array", TypeNode<$>]
// | readonly ["Set", TypeNode<$>]
// | readonly ["Map", TypeNode<$>, TypeNode<$>]

export type TraversalObjectKindRule =
    | DefaultObjectKind
    | readonly ["Array", TraversalNode]
// | readonly ["Set", TraversalNode]
// | readonly ["Map", TraversalNode, TraversalNode]

export const objectKindIntersection = composeIntersection<ObjectKindRule>(
    (l, r, state) => {
        if (typeof l === "string") {
            if (typeof r === "string") {
                return l === r
                    ? equality()
                    : state.addDisjoint("objectKind", l, r)
            }
            return l === r[0] ? r : state.addDisjoint("objectKind", l, r[0])
        }
        if (typeof r === "string") {
            return l[0] === r ? l : state.addDisjoint("objectKind", l[0], r)
        }
        if (l[0] !== r[0]) {
            return state.addDisjoint("objectKind", l[0], r[0])
        }
        const result = [l[0]] as any as mutable<Exclude<ObjectKindRule, string>>
        let lImpliesR = true
        let rImpliesL = true
        for (let i = 1; i < l.length; i++) {
            const lNode = l[i] as TypeNode
            const rNode = r[i] as TypeNode
            state.path.push(objectKindParameterToPathSegment(l[0], i))
            const parameterResult = nodeIntersection(lNode, rNode, state)
            state.path.pop()
            if (isEquality(parameterResult)) {
                result[i] = lNode
            } else if (parameterResult === l) {
                result[i] = lNode
                rImpliesL = false
            } else if (parameterResult === r) {
                result[i] = rNode
                lImpliesR = false
            } else if (isDisjoint(parameterResult)) {
                return parameterResult
            } else {
                result[i] = parameterResult
                lImpliesR = false
                rImpliesL = false
            }
        }
        return lImpliesR ? (rImpliesL ? equality() : l) : rImpliesL ? r : result
    }
)

type ParameterizableObjectKindRuleName = Extract<ObjectKindRule, List>[0]

const objectKindParameterToPathSegment = (
    objectKind: ParameterizableObjectKindRuleName,
    i: number
): ObjectKindPathSegment =>
    objectKind === "Array"
        ? "${number}"
        : objectKind === "Set"
        ? "${item}"
        : objectKind === "Map"
        ? i === 1
            ? "${key}"
            : "${value}"
        : throwInternalError(
              `Unexpected parameterized objectKind '${objectKind}'`
          )

export const objectKindPathSegments = {
    "${number}": true,
    "${item}": true,
    "${key}": true,
    "${value}": true
} as const

export type ObjectKindPathSegment = keyof typeof objectKindPathSegments

export const flattenObjectKind: FlattenAndPushRule<ObjectKindRule> = (
    entries,
    rule,
    ctx
) =>
    entries.push([
        "objectKind",
        typeof rule === "string" ? rule : [rule[0], flattenNode(rule[1], ctx)]
    ])

export const arrayOf = (node: TypeNode): ResolvedNode => ({
    object: {
        objectKind: ["Array", node]
    }
})
