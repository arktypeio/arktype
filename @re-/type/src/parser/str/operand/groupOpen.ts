import type { Left } from "../state/left.js"
import type { parserState } from "../state/state.js"

export namespace GroupOpen {
    export type Reduce<L extends Left> = Left.From<{
        groups: [...L["groups"], L["branches"]]
        branches: Left.OpenBranches.Default
        root: undefined
    }>

    export const reduce = (s: parserState) => {
        s.l.groups.push(s.l.branches)
        s.l.branches = {}
        return s
    }

    export const unclosedMessage = "Missing )."
    export type UnclosedGroupMessage = typeof unclosedMessage
}
