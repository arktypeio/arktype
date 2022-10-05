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
        S extends ParserState.T.WithRoot,
        Unscanned extends string
    > = Unscanned extends ""
        ? ParserState.error<MissingRightOperandMessage<"&">>
        : ParserState.from<{
              root: null
              branches: {
                  leftBound: S["branches"]["leftBound"]
                  union: S["branches"]["union"]
                  intersection: [
                      MaybeAppend<S["root"], S["branches"]["intersection"]>,
                      "&"
                  ]
              }
              groups: S["groups"]
              unscanned: Unscanned
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
