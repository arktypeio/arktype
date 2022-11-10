import type {
    DynamicWithRoot,
    StaticOpenBranches,
    StaticWithRoot
} from "../state/static.js"
import { errorState, finalizeGroup } from "../state/static.js"

export const parseGroupClose = (s: DynamicWithRoot) => {
    const previousOpenBranches = s.groups.pop()
    if (!previousOpenBranches) {
        return errorState(buildUnmatchedGroupCloseMessage(s.scanner.unscanned))
    }
    return finalizeGroup(s, previousOpenBranches)
}

export type parseGroupClose<s extends StaticWithRoot> =
    s["groups"] extends popGroup<infer stack, infer top>
        ? finalizeGroup<s, top, stack>
        : errorState<buildUnmatchedGroupCloseMessage<s["unscanned"]>>

type popGroup<
    stack extends StaticOpenBranches[],
    top extends StaticOpenBranches
> = [...stack, top]

export const buildUnmatchedGroupCloseMessage = <unscanned extends string>(
    unscanned: unscanned
): buildUnmatchedGroupCloseMessage<unscanned> =>
    `Unmatched )${(unscanned === "" ? "" : ` before ${unscanned}`) as any}`

type buildUnmatchedGroupCloseMessage<unscanned extends string> =
    `Unmatched )${unscanned extends "" ? "" : ` before ${unscanned}`}`
