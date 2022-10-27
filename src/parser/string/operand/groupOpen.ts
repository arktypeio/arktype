import type { StaticState } from "../state/state.js"
import { DynamicState } from "../state/state.js"

export namespace GroupOpen {
    export const parse = (s: DynamicState) => {
        s.groups.push(s.branches)
        s.branches = DynamicState.initializeBranches()
        return s
    }

    export type parse<
        s extends StaticState,
        unscanned extends string
    > = StaticState.from<{
        groups: [...s["groups"], s["branches"]]
        branches: StaticState.initialBranches
        root: null
        unscanned: unscanned
    }>

    export const unclosedMessage = "Missing )"
    export type unclosedMessage = typeof unclosedMessage
}
