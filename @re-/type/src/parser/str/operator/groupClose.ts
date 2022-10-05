import { ParserState } from "../state/state.js"

export namespace GroupClose {
    export const reduce = (s: ParserState.WithRoot) => {
        const previousOpenBranches = s.groups.pop()
        if (!previousOpenBranches) {
            return ParserState.error(buildUnmatchedMessage(s.scanner.unscanned))
        }
        return ParserState.finalizeGroup(s, previousOpenBranches)
    }

    export type reduce<
        s extends ParserState.T.WithRoot,
        unscanned extends string
    > = s["groups"] extends popGroup<infer stack, infer top>
        ? ParserState.finalizeGroup<s, top, stack, unscanned>
        : ParserState.error<buildUnmatchedMessage<unscanned>>

    type popGroup<
        stack extends ParserState.OpenBranches[],
        top extends ParserState.OpenBranches
    > = [...stack, top]

    export const buildUnmatchedMessage = <unscanned extends string>(
        unscanned: unscanned
    ): buildUnmatchedMessage<unscanned> =>
        `Unmatched )${(unscanned === "" ? "" : ` before ${unscanned}`) as any}.`

    type buildUnmatchedMessage<unscanned extends string> =
        `Unmatched )${unscanned extends "" ? "" : ` before ${unscanned}`}.`
}
