import type { Base } from "../../../nodes/common.js"
import type { Bound } from "../../../nodes/expression/bound.js"
import type { Intersection } from "../../../nodes/expression/intersection.js"
import type { Union } from "../../../nodes/expression/union.js"
import type { PrimitiveLiteral } from "../../../nodes/terminal/primitiveLiteral.js"
import type { ParseError } from "../../common.js"

type leftBase = {
    groups: left.openBranches[]
    branches: left.openBranches
    root?: Base.Node
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

    export type openLeftBound = [
        PrimitiveLiteral.Node<number>,
        Bound.DoubleToken
    ]
}

export namespace Left {
    export type OpenBranches = {
        leftBound: OpenBranches.LeftBound | null
        union: OpenBranches.Union | null
        intersection: OpenBranches.Intersection | null
    }

    export namespace OpenBranches {
        export type From<Branches extends OpenBranches> = Branches

        export type Default = From<{
            leftBound: null
            union: null
            intersection: null
        }>

        export type LeftBound<
            Limit extends PrimitiveLiteral.Number = PrimitiveLiteral.Number,
            Comparator extends Bound.DoubleToken = Bound.DoubleToken
        > = [Limit, Comparator]

        export type Union = [unknown, Union.Token]

        export type Intersection = [unknown, Intersection.Token]
    }
}

export namespace Left {
    export type With<Constraints extends Partial<LeftBase>> = LeftBase &
        Constraints

    export type From<L extends LeftBase> = L

    export type Error<Message extends string> = From<{
        groups: []
        branches: OpenBranches.Default
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
