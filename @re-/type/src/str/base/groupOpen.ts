import { Left, state } from "../parser/index.js"

export type Reduce<L extends Left.Base> = Left.From<{
    bounds: L["bounds"]
    groups: [...L["groups"], L["branches"]]
    branches: {}
    root: undefined
}>

export const reduce = (s: state) => {
    s.l.groups.push(s.l.branches)
    s.l.branches = {}
    return s
}
