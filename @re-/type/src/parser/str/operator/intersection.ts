import { Intersection } from "../../../nodes/nonTerminal/intersection.js"
import type { MaybeAppend, MissingRightOperandMessage } from "../../common.js"
import type { Left } from "../state/left.js"
import type { parserState } from "../state/state.js"

export namespace IntersectionOperator {
    type PushChild<B extends Left.OpenBranches, Root> = Left.OpenBranches.From<{
        leftBound: B["leftBound"]
        union: B["union"]
        intersection: [MaybeAppend<Root, B["intersection"]>, "&"]
    }>

    export const reduce = (s: parserState.requireRoot) => {
        if (!s.l.branches.intersection) {
            s.l.branches.intersection = new Intersection.Node([s.l.root])
        } else {
            s.l.branches.intersection.pushChild(s.l.root)
        }
        s.l.root = undefined as any
        return s
    }

    export type Reduce<
        L extends Left,
        Unscanned extends string
    > = Unscanned extends ""
        ? MissingRightOperandMessage<"&">
        : Left.From<{
              groups: L["groups"]
              branches: PushChild<L["branches"], L["root"]>
              root: undefined
          }>

    export const maybeMerge = (s: parserState.requireRoot) => {
        if (!s.l.branches.intersection) {
            return s
        }
        s.l.branches.intersection.pushChild(s.l.root)
        s.l.root = s.l.branches.intersection
        s.l.branches.intersection = undefined
        return s
    }
}
