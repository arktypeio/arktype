import type { maybePush } from "../common.js"
import { intersection } from "../state/intersection.js"
import { State } from "../state/state.js"
import { LeftBound } from "./bounds/left.js"

export namespace Intersection {
    export const parse = (s: State.DynamicWithRoot) => {
        if (State.hasOpenLeftBound(s)) {
            return LeftBound.unpairedError(s)
        }
        s.branches.intersection ??= []
        s.branches.intersection.push(s.root)
        s.root = State.unset
        return s
    }

    export type parse<s extends State.StaticWithRoot> =
        s extends State.StaticWithOpenLeftBound
            ? LeftBound.unpairedError<s>
            : State.from<{
                  root: undefined
                  branches: {
                      leftBound: undefined
                      union: s["branches"]["union"]
                      intersection: [collectBranches<s>, "&"]
                  }
                  groups: s["groups"]
                  unscanned: s["unscanned"]
              }>

    export type collectBranches<s extends State.StaticWithRoot> = maybePush<
        s["branches"]["intersection"],
        s["root"]
    >

    export const mergeDescendantsToRootIfPresent = (
        s: State.DynamicWithRoot
    ) => {
        if (State.hasOpenLeftBound(s)) {
            return LeftBound.unpairedError(s)
        }
        if (!s.branches.intersection) {
            return s
        }
        s.root = intersection(s.branches.intersection)
        delete s.branches.intersection
        return s
    }
}
