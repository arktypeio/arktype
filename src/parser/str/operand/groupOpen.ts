import { ParserState } from "../state/state.js"

export namespace GroupOpen {
    export const reduce = (s: ParserState.Base) => {
        s.groups.push(s.branches)
        s.branches = ParserState.initializeBranches()
        return s
    }

    export type reduce<
        s extends ParserState.T.Unfinished,
        unscanned extends string
    > = ParserState.from<{
        groups: [...s["groups"], s["branches"]]
        branches: ParserState.initialBranches
        root: null
        unscanned: unscanned
    }>

    export const unclosedMessage = "Missing )"
    export type unclosedMessage = typeof unclosedMessage
}
