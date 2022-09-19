import { Left } from "../state/left.js"
import { parserState } from "../state/state.js"

export type ReduceGroupOpen<L extends Left> = Left.From<{
    lowerBound: L["lowerBound"]
    groups: [...L["groups"], L["branches"]]
    branches: {}
    root: undefined
}>

export const reduceGroupOpen = (s: parserState) => {
    s.l.groups.push(s.l.branches)
    s.l.branches = {}
    return s
}
