import type { maybePush } from "../../../utils/generics.js"
import { State } from "../../state/state.js"
import type { unpairedLeftBoundError } from "../bounds/left.js"
import type { mergeIntersectionDescendants } from "../intersection/parse.js"
import { mergeIntersectionDescendantsToRoot } from "../intersection/parse.js"
import { compileUnion } from "./compile.js"

export const parseUnion = (s: State.DynamicWithRoot) => {
    mergeIntersectionDescendantsToRoot(s)
    s.branches.union ??= []
    s.branches.union.push(s.root)
    s.root = State.unset
    return s
}

export type parseUnion<s extends State.StaticWithRoot> =
    s extends State.StaticWithOpenRange
        ? unpairedLeftBoundError<s>
        : State.from<{
              root: undefined
              branches: {
                  range: undefined
                  intersection: undefined
                  union: [mergeUnionDescendants<s>, "|"]
              }
              groups: s["groups"]
              unscanned: s["unscanned"]
          }>

export type mergeUnionDescendants<s extends State.StaticWithRoot> = maybePush<
    s["branches"]["union"],
    mergeIntersectionDescendants<s>
>

export const mergeUnionDescendantsToRoot = (s: State.DynamicWithRoot) => {
    mergeIntersectionDescendantsToRoot(s)
    if (!s.branches.union) {
        return s
    }
    s.branches.union.push(s.root)
    s.root = compileUnion(s.branches.union)
    delete s.branches.union
    return s
}
