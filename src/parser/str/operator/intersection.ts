import type { maybePush } from "../../common.js"
import { ParserState } from "../state/state.js"
import { LeftBoundOperator } from "./bound/left.js"

export namespace IntersectionOperator {
    export const reduce = (s: ParserState.WithRoot) => {
        if (ParserState.openLeftBounded(s)) {
            return LeftBoundOperator.unpairedError(s)
        }
        if (!s.branches.intersection?.push(s.root)) {
            s.branches.intersection = [s.root]
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
                  union: s["branches"]["union"]
                  intersection: [collectBranches<s>, "&"]
              }
              groups: s["groups"]
              unscanned: unscanned
          }>

    export type collectBranches<s extends ParserState.T.WithRoot> = maybePush<
        s["branches"]["intersection"],
        s["root"]
    >

    export const mergeDescendantsToRootIfPresent = (
        s: ParserState.WithRoot
    ) => {
        if (ParserState.openLeftBounded(s)) {
            return LeftBoundOperator.unpairedError(s)
        }
        if (!s.branches.intersection) {
            return s
        }
        s.branches.intersection.push(s.root)
        s.root = s.branches.intersection
        s.branches.intersection = undefined
        return s
    }
}
