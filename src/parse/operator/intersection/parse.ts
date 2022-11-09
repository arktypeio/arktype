import type { maybePush } from "../../../utils/generics.js"
import { State } from "../../state/state.js"
import { LeftBound } from "../bounds/left.js"
import { compileIntersection } from "./compile.js"

export const parseIntersection = (s: State.DynamicWithRoot) => {
    if (State.hasOpenRange(s)) {
        return LeftBound.unpairedError(s)
    }
    s.branches.intersection ??= []
    s.branches.intersection.push(s.root)
    s.root = State.unset
    return s
}

export type parseIntersection<s extends State.StaticWithRoot> =
    s extends State.StaticWithOpenRange
        ? LeftBound.unpairedError<s>
        : State.from<{
              root: undefined
              branches: {
                  range: undefined
                  union: s["branches"]["union"]
                  intersection: [mergeIntersectionDescendants<s>, "&"]
              }
              groups: s["groups"]
              unscanned: s["unscanned"]
          }>

export type mergeIntersectionDescendants<s extends State.StaticWithRoot> =
    maybePush<s["branches"]["intersection"], s["root"]>

export const mergeIntersectionDescendantsToRoot = (
    s: State.DynamicWithRoot
) => {
    if (State.hasOpenRange(s)) {
        return LeftBound.unpairedError(s)
    }
    if (!s.branches.intersection) {
        return s
    }
    s.root = compileIntersection(s.branches.intersection)
    delete s.branches.intersection
    return s
}
