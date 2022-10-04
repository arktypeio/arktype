import type { ParserState } from "../state/state.js"
import { parserState } from "../state/state.js"

export namespace groupClose {
    export const reduce = (s: parserState.WithRoot) => {
        const previousOpenBranches = s.groups.pop()
        if (!previousOpenBranches) {
            return parserState.error(buildUnmatchedMessage(s.scanner.unscanned))
        }
        return parserState.finalizeGroup(s, previousOpenBranches)
    }
}

export namespace GroupClose {
    type popGroup<
        stack extends ParserState.OpenBranches[],
        top extends ParserState.OpenBranches
    > = [...stack, top]

    export type reduce<
        s extends ParserState.WithRoot,
        unscanned extends string
    > = s["groups"] extends popGroup<infer stack, infer top>
        ? ParserState.finalizeGroup<s, top, stack, unscanned>
        : ParserState.error<buildUnmatchedMessage<unscanned>>
}

export namespace groupClose {
    export const buildUnmatchedMessage = <unscanned extends string>(
        unscanned: unscanned
    ): GroupClose.buildUnmatchedMessage<unscanned> =>
        `Unmatched )${(unscanned === "" ? "" : ` before ${unscanned}`) as any}.`
}

export namespace GroupClose {
    export type buildUnmatchedMessage<unscanned extends string> =
        `Unmatched )${unscanned extends "" ? "" : ` before ${unscanned}`}.`
}
