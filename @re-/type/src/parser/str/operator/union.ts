import { Union } from "../../../nodes/expression/branching/union.js"
import type { MissingRightOperandMessage } from "../../common.js"
import type { ParserState } from "../state/state.js"
import { IntersectionOperator } from "./intersection.js"

export namespace UnionOperator {
    export const reduce = (s: ParserState.WithRoot) => {
        IntersectionOperator.maybeMerge(s)
        if (!s.branches.union) {
            s.branches.union = new Union.Node([s.root])
        } else {
            s.branches.union.pushChild(s.root)
        }
        s.root = undefined as any
        return s
    }

    export type reduce<
        s extends ParserState.T.WithRoot,
        unscanned extends string
    > = unscanned extends ""
        ? ParserState.error<MissingRightOperandMessage<"|">>
        : ParserState.from<{
              root: undefined
              branches: {
                  leftBound: s["branches"]["leftBound"]
                  intersection: null
                  union: [ParserState.mergeIntersectionAndUnion<s>, "|"]
              }
              groups: s["groups"]
              unscanned: unscanned
          }>

    export const maybeMerge = (s: ParserState.WithRoot) => {
        if (!s.branches.union) {
            return s
        }
        s.branches.union.pushChild(s.root)
        s.root = s.branches.union
        s.branches.union = undefined
        return s
    }
}
