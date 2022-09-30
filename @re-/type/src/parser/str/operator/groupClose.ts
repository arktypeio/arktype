import type { NodeToString } from "../../../nodes/common.js"
import type { Left } from "../state/left.js"
import type { ParserState } from "../state/state.js"
import { parserState } from "../state/state.js"
import type { LeftBoundOperator } from "./bound/left.js"

export namespace GroupClose {
    type PopGroup<
        Stack extends Left.OpenBranches[],
        Top extends Left.OpenBranches
    > = [...Stack, Top]

    type UnmatchedMessage<Unscanned extends string> =
        `Unmatched )${Unscanned extends "" ? "" : ` before ${Unscanned}`}.`

    export const unmatchedMessage = <Unscanned extends string>(
        unscanned: Unscanned
    ): UnmatchedMessage<Unscanned> =>
        `Unmatched )${(unscanned === "" ? "" : ` before ${unscanned}`) as any}.`

    export type Reduce<
        S extends ParserState.RequireRoot,
        Unscanned extends string
    > = S["L"]["groups"] extends PopGroup<infer Stack, infer Top>
        ? S["L"]["branches"]["leftBound"] extends Left.OpenBranches.LeftBound<
              infer Limit,
              infer Comparator
          >
            ? ParserState.Error<
                  LeftBoundOperator.UnpairedMessage<
                      NodeToString<S["L"]["root"]>,
                      Limit,
                      Comparator
                  >
              >
            : ParserState.From<{
                  L: {
                      groups: Stack
                      branches: Top
                      root: ParserState.MergeBranches<S["L"]>
                  }
                  R: Unscanned
              }>
        : ParserState.Error<UnmatchedMessage<Unscanned>>

    export const reduce = (s: parserState.requireRoot) => {
        const previousOpenBranches = s.l.groups.pop()
        if (!previousOpenBranches) {
            return s.error(unmatchedMessage(s.r.unscanned))
        }
        parserState.mergeBranches(s)
        s.l.branches = previousOpenBranches
        return s
    }
}
