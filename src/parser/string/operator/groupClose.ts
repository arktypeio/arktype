import type { StaticState } from "../state/state.js"
import { DynamicState } from "../state/state.js"

export namespace GroupClose {
    export const parse = (s: DynamicState.WithRoot) => {
        const previousOpenBranches = s.groups.pop()
        if (!previousOpenBranches) {
            return DynamicState.error(
                buildUnmatchedMessage(s.scanner.unscanned)
            )
        }
        return DynamicState.finalizeGroup(s, previousOpenBranches)
    }

    export type parse<s extends StaticState.WithRoot> =
        s["groups"] extends popGroup<infer stack, infer top>
            ? StaticState.finalizeGroup<s, top, stack>
            : StaticState.error<buildUnmatchedMessage<s["unscanned"]>>

    type popGroup<
        stack extends StaticState.OpenBranches[],
        top extends StaticState.OpenBranches
    > = [...stack, top]

    export const buildUnmatchedMessage = <unscanned extends string>(
        unscanned: unscanned
    ): buildUnmatchedMessage<unscanned> =>
        `Unmatched )${(unscanned === "" ? "" : ` before ${unscanned}`) as any}.`

    type buildUnmatchedMessage<unscanned extends string> =
        `Unmatched )${unscanned extends "" ? "" : ` before ${unscanned}`}.`
}
