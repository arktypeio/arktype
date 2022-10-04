import type { Base } from "../../../nodes/common.js"
import { Union } from "../../../nodes/expression/union.js"
import type { MaybeAppend, MissingRightOperandMessage } from "../../common.js"
import type { Left } from "../state/left.js"
import type { parserState } from "../state/state.js"
import { IntersectionOperator } from "./intersection.js"

export namespace UnionOperator {
    export const reduce = (s: parserState.requireRoot) => {
        IntersectionOperator.maybeMerge(s)
        if (!s.l.branches.union) {
            s.l.branches.union = new Union.Node([s.l.root])
        } else {
            s.l.branches.union.pushChild(s.l.root)
        }
        s.l.root = undefined as any
        return s
    }

    export type Reduce<
        L extends Left,
        Unscanned extends string
    > = Unscanned extends ""
        ? MissingRightOperandMessage<"|">
        : Left.From<{
              groups: L["groups"]
              branches: PushChild<L["branches"], L["root"]>
              root: undefined
          }>

    type PushChild<B extends Left.OpenBranches, Root> = Left.OpenBranches.From<{
        leftBound: B["leftBound"]
        intersection: null
        union: [
            MaybeAppend<MaybeAppend<Root, B["intersection"]>, B["union"]>,
            "|"
        ]
    }>

    export const maybeMerge = (s: parserState<{ root: Base.Node }>) => {
        if (!s.l.branches.union) {
            return s
        }
        s.l.branches.union.pushChild(s.l.root)
        s.l.root = s.l.branches.union
        s.l.branches.union = undefined
        return s
    }
}
