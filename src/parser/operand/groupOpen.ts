import { State } from "../state/state.js"

export namespace GroupOpen {
    export const parse = (s: State.Dynamic) => {
        s.groups.push(s.branches)
        s.branches = State.initializeBranches()
        return s
    }

    export type parse<
        s extends State.Static,
        unscanned extends string
    > = State.from<{
        groups: [...s["groups"], s["branches"]]
        branches: State.initialBranches
        root: null
        unscanned: unscanned
    }>

    export const unclosedMessage = "Missing )"
    export type unclosedMessage = typeof unclosedMessage
}
