import { State } from "../state/state.js"

export const parseGroupOpen = (s: State.Dynamic) => {
    s.groups.push(s.branches)
    s.branches = State.initializeBranches()
    return s
}

export type parseGroupOpen<
    s extends State.Static,
    unscanned extends string
> = State.from<{
    groups: [...s["groups"], s["branches"]]
    branches: State.initialBranches
    root: undefined
    unscanned: unscanned
}>

export const unclosedGroupMessage = "Missing )"
export type unclosedGroupMessage = typeof unclosedGroupMessage
