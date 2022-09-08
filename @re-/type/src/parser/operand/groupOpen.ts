import { Parser } from "./common.js"

export type ReduceGroupOpen<L extends Parser.Left> = Parser.Left.From<{
    lowerBound: L["lowerBound"]
    groups: [...L["groups"], L["branches"]]
    branches: {}
    root: undefined
}>

export const reduceGroupOpen = (s: Parser.state) => {
    s.l.groups.push(s.l.branches)
    s.l.branches = {}
    return s
}
