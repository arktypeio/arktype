import type { maybePush } from "../../../utils/generics.js"
import type {
    DynamicWithRoot,
    stateFrom,
    StaticWithOpenRange,
    StaticWithRoot
} from "../../state/state.js"
import type { unpairedLeftBoundError } from "../bounds/left.js"
import type { mergeIntersectionDescendants } from "../intersection.js"
import { mergeIntersectionDescendantsToRoot } from "../intersection.js"
import { compileUnion } from "./compile.js"

export const parseUnion = (s: DynamicWithRoot) => {
    mergeIntersectionDescendantsToRoot(s)
    s.branches.union ??= []
    s.branches.union.push(s.root.eject())
    return s
}

export type parseUnion<s extends StaticWithRoot> = s extends StaticWithOpenRange
    ? unpairedLeftBoundError<s>
    : stateFrom<{
          root: undefined
          branches: {
              range: undefined
              intersection: undefined
              union: [mergeUnionDescendants<s>, "|"]
          }
          groups: s["groups"]
          unscanned: s["unscanned"]
      }>

export type mergeUnionDescendants<s extends StaticWithRoot> = maybePush<
    s["branches"]["union"],
    mergeIntersectionDescendants<s>
>

export const mergeUnionDescendantsToRoot = (s: DynamicWithRoot) => {
    mergeIntersectionDescendantsToRoot(s)
    if (!s.branches.union) {
        return s
    }
    s.branches.union.push(s.root.eject())
    s.root.reinitialize(compileUnion(s.branches.union))
    delete s.branches.union
    return s
}
