import type { Base } from "../../../nodes/common.js"
import type { Bound } from "../../../nodes/expression/bound.js"
import type { Intersection } from "../../../nodes/expression/intersection.js"
import type { Union } from "../../../nodes/expression/union.js"
import type { PrimitiveLiteral } from "../../../nodes/terminal/primitiveLiteral.js"
import type { MaybeAppend, ParseError } from "../../common.js"
import { GroupOpen } from "../operand/groupOpen.js"
import { LeftBoundOperator } from "../operator/bound/left.js"
import { IntersectionOperator } from "../operator/intersection.js"
import { UnionOperator } from "../operator/union.js"
import type { parserState } from "./state.js"

type leftBase = {
    groups: left.openBranches[]
    branches: left.openBranches
    root?: Base.Node
    // At runtime (unlike in type parsing), an error will actually throw, so a
    // "final" error state is impossible
    final?: "END"
}

export type left<constraints extends Partial<leftBase> = {}> = leftBase &
    constraints

type LeftBase = {
    groups: Left.OpenBranches[]
    branches: Left.OpenBranches
    root: unknown
    final?: "END" | "ERR"
}

export type Left<Constraints extends Partial<LeftBase> = { final?: "END" }> =
    LeftBase & Constraints

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

    export const mergeIntersectionAndUnionToRoot = (
        s: parserState.requireRoot
    ) => {
        IntersectionOperator.maybeMerge(s)
        UnionOperator.maybeMerge(s)
        return s
    }

    export const finalize = (s: parserState.requireRoot) => {
        if (s.l.groups.length) {
            return s.error(GroupOpen.unclosedMessage)
        }
        finalizeGroup(s, {})
        s.l.final = "END"
        return s
    }

    export const finalizeGroup = (
        s: parserState.requireRoot,
        nextBranches: openBranches
    ) => {
        left.mergeIntersectionAndUnionToRoot(s)
        LeftBoundOperator.assertClosed(s)
        s.l.branches = nextBranches
        return s as parserState
    }
}

export namespace Left {
    export type OpenBranches = {
        leftBound: OpenBranches.LeftBound | null
        union: OpenBranches.Union | null
        intersection: OpenBranches.Intersection | null
    }

    export type Finalize<L extends Left> = L["groups"] extends []
        ? Left.FinalizeGroup<
              LeftBoundOperator.AssertClosed<L>,
              Left.OpenBranches.Default,
              [],
              true
          >
        : Left.Error<GroupOpen.UnclosedGroupMessage>

    export type FinalizeGroup<
        L extends Left.Unvalidated,
        NextBranches extends OpenBranches,
        NextGroups extends OpenBranches[],
        IsFinal extends boolean
    > = L extends Left.Valid
        ? Left.From<{
              groups: NextGroups
              branches: NextBranches
              root: Left.MergeIntersectionAndUnionToRoot<L>
              final: IsFinal extends true ? "END" : undefined
          }>
        : L

    export type MergeIntersectionAndUnionToRoot<L extends Left> = MaybeAppend<
        MaybeAppend<L["root"], L["branches"]["intersection"]>,
        L["branches"]["union"]
    >

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
        final: "ERR"
    }>

    export type SetRoot<L extends LeftBase, Node> = From<{
        groups: L["groups"]
        branches: L["branches"]
        root: Node
    }>

    export type WithRoot<Root> = With<{
        root: Root
        final?: "END"
    }>

    export type Unvalidated<Preconditions extends Partial<LeftBase> = {}> =
        With<Preconditions>

    export type Valid = { final?: "END" }
}
