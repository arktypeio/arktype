import type { Dict } from "../../utils/generics.ts"
import type { Path } from "../../utils/paths.ts"
import type { Compilation } from "../compile.ts"
import { compileNode } from "../compile.ts"
import {
    composeIntersection,
    composeKeyedIntersection,
    equality,
    isDisjoint,
    isEquality
} from "../compose.ts"
import type { Node } from "../node.ts"
import { isLiteralNode, nodeIntersection } from "../node.ts"
import { Problem } from "../problems.ts"

export type PropsRule<$ = Dict> = {
    [propKey in string]: Prop<$>
}

export type Prop<$ = Dict, node extends Node<$> = Node<$>> =
    | node
    | OptionalProp<$, node>
    | PrerequisiteProp<$, node>

export type OptionalProp<$ = Dict, node extends Node<$> = Node<$>> = ["?", node]

export type PrerequisiteProp<$ = Dict, node extends Node<$> = Node<$>> = [
    "!",
    node
]

export type PropsRecordKey = "distilledProps" | "strictProps"

export type PropsRecordEntry<kind extends PropsRecordKey = PropsRecordKey> = [
    kind,
    {
        required: { [propKey in string]: string }
        optional: { [propKey in string]: string }
        index?: string
    }
]

export type DistilledPropsEntry = PropsRecordEntry<"distilledProps">

export type StrictPropsEntry = PropsRecordEntry<"strictProps">

export type PropEntry =
    | RequiredPropEntry
    | OptionalPropEntry
    | IndexPropEntry
    | PrerequisitePropEntry

export type PrerequisitePropEntry = ["prerequisiteProp", TraversalProp]

export type RequiredPropEntry = ["requiredProp", TraversalProp]

export type OptionalPropEntry = ["optionalProp", TraversalProp]

export type IndexPropEntry = ["indexProp", string]

export type TraversalProp<
    key extends string = string,
    node extends string = string
> = [key, node]

export const isOptional = (prop: Prop): prop is OptionalProp =>
    (prop as OptionalProp)[0] === "?"

export const isPrerequisite = (prop: Prop): prop is PrerequisiteProp =>
    (prop as PrerequisiteProp)[0] === "!"

export const mappedKeys = {
    index: "[index]"
} as const

export type MappedKeys = typeof mappedKeys

export type MappedPropKey = MappedKeys[keyof MappedKeys]

export const propToNode = (prop: Prop) =>
    isOptional(prop) || isPrerequisite(prop) ? prop[1] : prop

const getTupleLengthIfPresent = (result: PropsRule) => {
    if (
        typeof result.length === "object" &&
        isPrerequisite(result.length) &&
        typeof result.length[1] !== "string" &&
        isLiteralNode(result.length[1], "number")
    ) {
        return result.length[1].number.value
    }
}

export const propsIntersection = composeIntersection<PropsRule>(
    (l, r, state) => {
        const result = propKeysIntersection(l, r, state)
        if (typeof result === "symbol") {
            return result
        }
        const lengthValue = getTupleLengthIfPresent(result)
        if (lengthValue === undefined || !(mappedKeys.index in result)) {
            return result
        }
        // if we are at this point, we have an array with an exact length (i.e.
        // a tuple) and an index signature. Intersection each tuple item with
        // the index signature node and remove the index signature via a new
        // updated result, copied from result to avoid mutating existing references.
        const { [mappedKeys.index]: indexProp, ...updatedResult } = result
        const indexNode = propToNode(indexProp)
        for (let i = 0; i < lengthValue; i++) {
            if (!updatedResult[i]) {
                updatedResult[i] = indexNode
                continue
            }
            const existingNodeAtIndex = propToNode(updatedResult[i])
            state.path.push(`${i}`)
            const updatedResultAtIndex = nodeIntersection(
                existingNodeAtIndex,
                indexNode,
                state
            )
            state.path.pop()
            if (isDisjoint(updatedResultAtIndex)) {
                return updatedResultAtIndex
            } else if (
                !isEquality(updatedResultAtIndex) &&
                updatedResultAtIndex !== existingNodeAtIndex
            ) {
                updatedResult[i] = updatedResultAtIndex
            }
        }
        return updatedResult
    }
)

const propKeysIntersection = composeKeyedIntersection<PropsRule>(
    (propKey, l, r, context) => {
        if (l === undefined) {
            return r === undefined ? equality() : r
        }
        if (r === undefined) {
            return l
        }
        context.path.push(propKey)
        const result = nodeIntersection(propToNode(l), propToNode(r), context)
        context.path.pop()
        const resultIsOptional = isOptional(l) && isOptional(r)
        if (isDisjoint(result) && resultIsOptional) {
            // If an optional key has an empty intersection, the type can
            // still be satisfied as long as the key is not included. Set
            // the node to never rather than invalidating the type.
            return {}
        }
        return result
    },
    { onEmpty: "bubble" }
)

export const compileProps = (props: PropsRule, c: Compilation) => {
    const keyConfig = c.type.config?.keys ?? c.type.scope.config.keys
    return compileLooseProps(props, c)
    // keyConfig === "loose"
    //     ? compileLooseProps(props, state)
    //     : compilePropsRecord(keyConfig, props, state)
}

const compileLooseProps = (props: PropsRule, c: Compilation) => {
    const lines: string[] = []
    // if we don't care about extraneous keys, compile props so we can iterate over the definitions directly
    for (const k in props) {
        const prop = props[k]
        if (k === mappedKeys.index) {
            if (c.path.length) {
                lines.push(
                    `const lastPath = state.path`,
                    `state.path = state.path.concat(${c.path.json})`
                )
            }
            const arrayLines = compileNode(propToNode(prop), c)
            lines.push(`${c.data}.filter((data, i) => {`)
            lines.push(`state.path.push(i)`, ...arrayLines, `state.path.pop()`)
            lines.push("})")
            if (c.path.length) {
                lines.push(`state.path = lastPath`)
            }
        } else {
            c.path.push(k)
            if (isOptional(prop)) {
                lines.push(...compileNode(prop[1], c))
            } else if (isPrerequisite(prop)) {
                lines.push(...compileNode(prop[1], c))
            } else {
                lines.push(...compileNode(prop, c))
            }
            c.path.pop()
        }
    }
    return lines
}

// const compilePropsRecord = (
//     kind: Exclude<KeyCheckKind, "loose">,
//     props: PropsRule,
//     state: CompilationState
// ) => {
//     const result: PropsRecordEntry[1] = {
//         required: {},
//         optional: {}
//     }
//     // if we need to keep track of extraneous keys, either to add problems or
//     // remove them, store the props as a Record to optimize for presence
//     // checking as we iterate over the data
//     for (const k in props) {
//         const prop = props[k]
//         state.path.push(k)
//         if (k === mappedKeys.index) {
//             result.index = compileNode(propToNode(prop), state)
//         } else if (isOptional(prop)) {
//             result.optional[k] = compileNode(prop[1], state)
//         } else if (isPrerequisite(prop)) {
//             // we still have to push prerequisite props as normal entries so they can be checked first
//             // entries.push(["prerequisiteProp", [k, compileNode(prop[1], ctx)]])
//         } else {
//             result.required[k] = compileNode(prop, state)
//         }
//         state.path.pop()
//     }
//     // entries.push([`${kind}Props`, result])
//     return ""
// }

export class MissingProblem extends Problem<undefined> {
    readonly code = "missing"

    constructor(path: Path) {
        super(undefined, path)
    }

    get mustBe() {
        return "defined"
    }
}

export class ExtraneousProblem extends Problem {
    readonly code = "extraneous"

    constructor(data: unknown, path: Path) {
        super(data, path)
    }

    get mustBe() {
        return "removed"
    }
}
