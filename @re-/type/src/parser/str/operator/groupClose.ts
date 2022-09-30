import type { Left } from "../state/left.js"
import type { ParserState } from "../state/state.js"
import { parserState } from "../state/state.js"

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

    export type Reduce<S extends ParserState.RequireRoot> =
        S["L"]["groups"] extends PopGroup<infer Stack, infer Top>
            ? ParserState.MergeBranches<S, Stack, Top>
            : ParserState.Error<UnmatchedMessage<S["R"]>>

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
