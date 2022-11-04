import type { maybePush } from "../common.js"
import { State } from "../state/state.js"
import type { LeftBoundOperator } from "./bounds/left.js"
import { IntersectionOperator } from "./intersection.js"

export namespace UnionOperator {
    export const parse = (s: State.DynamicWithRoot) => {
        IntersectionOperator.mergeDescendantsToRootIfPresent(s)
        s.branches.union ??= []
        s.branches.union.push(s.root)
        s.root = State.unset
        return s
    }

    export type parse<s extends State.StaticWithRoot> =
        s extends State.StaticWithOpenLeftBound
            ? LeftBoundOperator.unpairedError<s>
            : State.from<{
                  root: undefined
                  branches: {
                      leftBound: undefined
                      intersection: undefined
                      union: [collectBranches<s>, "|"]
                  }
                  groups: s["groups"]
                  unscanned: s["unscanned"]
              }>

    export type collectBranches<s extends State.StaticWithRoot> = maybePush<
        s["branches"]["union"],
        IntersectionOperator.collectBranches<s>
    >

    export const mergeDescendantsToRootIfPresent = (
        s: State.DynamicWithRoot
    ) => {
        IntersectionOperator.mergeDescendantsToRootIfPresent(s)
        if (!s.branches.union) {
            return s
        }
        s.root = { branches: ["|", ...s.branches.union, s.root] }
        delete s.branches.union
        return s
    }
}
