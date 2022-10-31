import { State } from "../state/state.js"

export namespace GroupClose {
    export const parse = (s: State.DynamicWithRoot) => {
        const previousOpenBranches = s.groups.pop()
        if (!previousOpenBranches) {
            return State.error(buildUnmatchedMessage(s.scanner.unscanned))
        }
        return State.finalizeGroup(s, previousOpenBranches)
    }

    export type parse<s extends State.StaticWithRoot> =
        s["groups"] extends popGroup<infer stack, infer top>
            ? State.finalizeGroup<s, top, stack>
            : State.error<buildUnmatchedMessage<s["unscanned"]>>

    type popGroup<
        stack extends State.StaticOpenBranches[],
        top extends State.StaticOpenBranches
    > = [...stack, top]

    export const buildUnmatchedMessage = <unscanned extends string>(
        unscanned: unscanned
    ): buildUnmatchedMessage<unscanned> =>
        `Unmatched )${(unscanned === "" ? "" : ` before ${unscanned}`) as any}.`

    type buildUnmatchedMessage<unscanned extends string> =
        `Unmatched )${unscanned extends "" ? "" : ` before ${unscanned}`}.`
}
