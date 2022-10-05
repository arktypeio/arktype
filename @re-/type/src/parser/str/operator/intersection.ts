import { Intersection } from "../../../nodes/expression/intersection.js"
import type { MaybeAppend, MissingRightOperandMessage } from "../../common.js"
import type { ParserState } from "../state/state.js"

export namespace IntersectionOperator {
    export const reduce = (s: ParserState.WithRoot) => {
        if (!s.branches.intersection) {
            s.branches.intersection = new Intersection.Node([s.root])
        } else {
            s.branches.intersection.pushChild(s.root)
        }
        s.root = undefined as any
        return s
    }

    export type reduce<
        s extends ParserState.T.WithRoot,
        unscanned extends string
    > = unscanned extends ""
        ? ParserState.error<MissingRightOperandMessage<"&">>
        : ParserState.from<{
              root: null
              branches: {
                  leftBound: s["branches"]["leftBound"]
                  union: s["branches"]["union"]
                  intersection: [
                      MaybeAppend<s["root"], s["branches"]["intersection"]>,
                      "&"
                  ]
              }
              groups: s["groups"]
              unscanned: unscanned
          }>

    export const maybeMerge = (s: ParserState.WithRoot) => {
        if (!s.branches.intersection) {
            return s
        }
        s.branches.intersection.pushChild(s.root)
        s.root = s.branches.intersection
        s.branches.intersection = undefined
        return s
    }
}
