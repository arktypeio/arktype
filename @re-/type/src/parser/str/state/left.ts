import type { Base } from "../../../nodes/base.js"
import type { Bound } from "../../../nodes/nonTerminal/binary/bound.js"
import type { Intersection } from "../../../nodes/nonTerminal/nary/intersection.js"
import type { Union } from "../../../nodes/nonTerminal/nary/union.js"
import type { LiteralNode } from "../../../nodes/terminal/literal.js"
import type { ParseError } from "../../common.js"
import type { ComparatorTokens } from "../operator/bound/tokens.js"

type leftBase = {
    groups: left.openBranches[]
    branches: left.openBranches
    root?: Base.node
    done?: true
}

export type left<constraints extends Partial<leftBase> = {}> = leftBase &
    constraints

type LeftBase = {
    groups: Left.OpenBranches[]
    branches: Left.OpenBranches
    root: unknown
    done?: true
}

export type Left<Constraints extends Partial<LeftBase> = {}> = LeftBase &
    Constraints

export namespace left {
    export type openBranches = {
        leftBound?: openLeftBound
        union?: Union.Node
        intersection?: Intersection.Node
    }

    export type openLeftBound = [LiteralNode<number>, Bound.Token]
}

export namespace Left {
    export type OpenBranches = {
        leftBound?: OpenLeftBound
        union?: OpenUnion
        intersection?: OpenIntersection
    }
}

export namespace Left {
    export type With<Constraints extends Partial<LeftBase>> = LeftBase &
        Constraints

    export type From<L extends LeftBase> = L

    export type Error<Message extends string> = From<{
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

    export type OpenLeftBound<
        Limit extends number = number,
        Comparator extends ComparatorTokens.Doublable = ComparatorTokens.Doublable
    > = [Limit, Comparator]

    export type OpenUnion = [unknown, Union.Token]

    export type OpenIntersection = [unknown, Intersection.Token]
}
