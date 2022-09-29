import type { Base } from "../../../nodes/base.js"
import type { Bound } from "../../../nodes/nonTerminal/infix/bound.js"
import type { Intersection } from "../../../nodes/nonTerminal/infix/intersection.js"
import type { Union } from "../../../nodes/nonTerminal/infix/union.js"
import type { LiteralNode } from "../../../nodes/terminal/literal.js"
import type { ParseError } from "../../common.js"

type leftBase = {
    groups: openBranches[]
    branches: openBranches
    root?: Base.node
    done?: true
}

export type left<constraints extends Partial<leftBase> = {}> = leftBase &
    constraints

type LeftBase = {
    groups: OpenBranches[]
    branches: OpenBranches
    root: unknown
    done?: true
}

export type Left<Constraints extends Partial<LeftBase> = {}> = LeftBase &
    Constraints

export namespace left {
    export const initialize = (): left => ({
        groups: [],
        branches: {}
    })
}

export namespace Left {
    export type New = From<{
        groups: []
        branches: {}
        root: undefined
    }>

    export type IsPrefixable<L extends LeftBase> = From<{
        groups: []
        branches: {}
        root: any
    }> extends L
        ? true
        : false
}

export namespace Left {
    export type With<Constraints extends Partial<LeftBase>> = LeftBase &
        Constraints

    export type From<L extends LeftBase> = L

    export type Error<Message extends string> = From<{
        lowerBound: null
        groups: []
        branches: {}
        root: ParseError<Message>
        done: true
    }>

    export type SetRoot<L extends LeftBase, Node> = From<{
        groups: L["groups"]
        branches: L["branches"]
        root: Node
    }>

    export type WithRoot<Root> = With<{ root: Root }>
}

export type openBranches = {
    leftBound?: [LiteralNode<number>, Bound.Token]
    union?: Union.Node
    intersection?: Intersection.Node
}

export type OpenBranches = {
    leftBound?: OpenBranches.OpenLeftBound
    union?: OpenBranches.OpenUnion
    intersection?: OpenBranches.OpenIntersection
}

export namespace openBranches {
    export const mergeBranches = (s: parserState.withRoot) => {
        if (hasMergeableIntersection(s)) {
            mergeIntersection(s)
        }
        if (hasMergeableUnion(s)) {
            mergeUnion(s)
        }
        return s
    }
}

export namespace OpenBranches {
    export type OpenLeftBound = [number, Bound.Token]

    export type OpenUnion = [unknown, Union.Token]

    export type OpenIntersection = [unknown, Intersection.Token]

    // TODO: Add left bound check here
    export type Merge<
        B extends OpenBranches,
        Root
    > = B["leftBound"] extends OpenLeftBound
        ? "error"
        : PushExpression<B["union"], PushExpression<B["intersection"], Root>>

    export type PushExpression<
        B extends unknown[] | undefined,
        Expression
    > = B extends unknown[] ? [...B, Expression] : Expression
}
