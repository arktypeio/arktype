import { Base } from "../../../nodes/base/base.js"
import { Union } from "../../../nodes/expression/branching/union.js"
import type { maybePush } from "../../common.js"
import type { ParserState } from "../state/state.js"
import type { LeftBoundOperator } from "./bound/left.js"
import { IntersectionOperator } from "./intersection.js"

export namespace UnionOperator {
    export const reduce = (s: ParserState.WithRoot) => {
        IntersectionOperator.mergeDescendantsToRootIfPresent(s)
        const branchAttributes = new Base.Attributes({})
        s.root.addBranch()
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
    > = s extends ParserState.openLeftBounded
        ? LeftBoundOperator.unpairedError<s>
        : ParserState.from<{
              root: undefined
              branches: {
                  leftBound: null
                  intersection: null
                  union: [collectBranches<s>, "|"]
              }
              groups: s["groups"]
              unscanned: unscanned
          }>

    export type collectBranches<s extends ParserState.T.WithRoot> = maybePush<
        s["branches"]["union"],
        IntersectionOperator.collectBranches<s>
    >

    export const mergeDescendantsToRootIfPresent = (
        s: ParserState.WithRoot
    ) => {
        IntersectionOperator.mergeDescendantsToRootIfPresent(s)
        if (!s.branches.union) {
            return s
        }
        s.branches.union.pushChild(s.root)
        s.root = s.branches.union
        s.branches.union = undefined
        return s
    }
}
