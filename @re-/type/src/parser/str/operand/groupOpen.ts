import type { ParserState } from "../state/state.js"
import { parserState } from "../state/state.js"

export namespace GroupOpen {
    export const reduce = (s: parserState) => {
        s.groups.push(s.branches)
        s.branches = parserState.initializeBranches()
        return s
    }

    export type reduce<
        s extends ParserState,
        unscanned extends string
    > = ParserState.from<{
        groups: [...s["groups"], s["branches"]]
        branches: ParserState.initialBranches
        root: undefined
        unscanned: unscanned
    }>

    export const unclosedMessage = "Missing )."
    export type UnclosedGroupMessage = typeof unclosedMessage
}
