import { Expression, State } from "../base/index.js"
import { Branches } from "./branch/index.js"

export namespace Group {
    export type ReduceOpen<L extends Expression.T> = Expression.From<{
        bounds: L["bounds"]
        groups: [...L["groups"], L["branches"]]
        branches: {}
        root: undefined
    }>

    export const reduceOpen = (s: State<Expression>) => {
        s.l.groups.push(s.l.branches)
        s.l.branches = {}
        return s
    }

    type PopGroup<
        Stack extends Branches.TypeState[],
        Top extends Branches.TypeState
    > = [...Stack, Top]

    export type ReduceClose<L extends Expression.T> =
        L["groups"] extends PopGroup<infer Stack, infer Top>
            ? Expression.From<{
                  bounds: L["bounds"]
                  groups: Stack
                  branches: Top
                  root: Branches.MergeAll<L["branches"], L["root"]>
              }>
            : Expression.Error<`Unexpected ).`>

    export const reduceClose = (s: State<Expression>) => {
        const previousBranches = s.l.groups.pop()
        if (previousBranches === undefined) {
            throw new Error(`Unexpected ).`)
        }
        Branches.mergeAll(s)
        s.l.branches = previousBranches
        return s
    }
}
