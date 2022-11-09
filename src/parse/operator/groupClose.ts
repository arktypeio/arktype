import { State } from "../state/state.js"

export const parseGroupClose = (s: State.DynamicWithRoot) => {
    const previousOpenBranches = s.groups.pop()
    if (!previousOpenBranches) {
        return State.error(buildUnmatchedGroupCloseMessage(s.scanner.unscanned))
    }
    return State.finalizeGroup(s, previousOpenBranches)
}

export type parseGroupClose<s extends State.StaticWithRoot> =
    s["groups"] extends popGroup<infer stack, infer top>
        ? State.finalizeGroup<s, top, stack>
        : State.error<buildUnmatchedGroupCloseMessage<s["unscanned"]>>

type popGroup<
    stack extends State.StaticOpenBranches[],
    top extends State.StaticOpenBranches
> = [...stack, top]

export const buildUnmatchedGroupCloseMessage = <unscanned extends string>(
    unscanned: unscanned
): buildUnmatchedGroupCloseMessage<unscanned> =>
    `Unmatched )${(unscanned === "" ? "" : ` before ${unscanned}`) as any}`

type buildUnmatchedGroupCloseMessage<unscanned extends string> =
    `Unmatched )${unscanned extends "" ? "" : ` before ${unscanned}`}`
