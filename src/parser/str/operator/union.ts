import type { maybePush } from "../../common.js"
import type { ParserState } from "../state/state.js"
import type { LeftBoundOperator } from "./bound/left.js"
import { IntersectionOperator } from "./intersection.js"

export namespace UnionOperator {
    export const reduce = (s: ParserState.WithRoot) => {
        IntersectionOperator.mergeDescendantsToRootIfPresent(s)
        if (!s.branches.union?.push(s.root)) {
            s.branches.union = [s.root]
        }
        s.root = null as any
        return s
    }

    export type reduce<
        s extends ParserState.T.WithRoot,
        unscanned extends string
    > = s extends ParserState.openLeftBounded
        ? LeftBoundOperator.unpairedError<s>
        : ParserState.from<{
              root: null
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
        s.branches.union.push(s.root)
        s.root = s.branches.union
        s.branches.union = undefined
        return s
    }
}
