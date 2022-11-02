import { assignIntersection } from "../../attributes/intersection.js"
import type { maybePush } from "../common.js"
import { State } from "../state/state.js"
import { LeftBoundOperator } from "./bound/left.js"

export namespace IntersectionOperator {
    export const parse = (s: State.DynamicWithRoot) => {
        if (State.hasOpenLeftBound(s)) {
            return LeftBoundOperator.unpairedError(s)
        }
        s.branches.intersection = s.branches.intersection
            ? assignIntersection(s.branches.intersection, s.root, s.context)
            : s.root
        s.root = State.unset
        return s
    }

    export type parse<s extends State.StaticWithRoot> =
        s extends State.StaticWithOpenLeftBound
            ? LeftBoundOperator.unpairedError<s>
            : State.from<{
                  root: null
                  branches: {
                      leftBound: null
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
            return LeftBoundOperator.unpairedError(s)
        }
        if (!s.branches.intersection) {
            return s
        }
        s.root = assignIntersection(s.branches.intersection, s.root, s.context)
        delete s.branches.intersection
        return s
    }
}
