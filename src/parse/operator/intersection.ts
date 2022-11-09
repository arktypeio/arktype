import type { maybePush } from "../../utils/generics.js"
import type { Attributes } from "../state/attributes/attributes.js"
import { intersect } from "../state/attributes/intersect.js"
import type {
    DynamicWithRoot,
    stateFrom,
    StaticWithOpenRange,
    StaticWithRoot
} from "../state/state.js"
import { stateHasOpenRange, unset } from "../state/state.js"
import { unpairedLeftBoundError } from "./bounds/left.js"

export const parseIntersection = (s: DynamicWithRoot) => {
    if (stateHasOpenRange(s)) {
        return unpairedLeftBoundError(s)
    }
    s.branches.intersection ??= []
    s.branches.intersection.push(s.root)
    s.root = unset
    return s
}

export type parseIntersection<s extends StaticWithRoot> =
    s extends StaticWithOpenRange
        ? unpairedLeftBoundError<s>
        : stateFrom<{
              root: undefined
              branches: {
                  range: undefined
                  union: s["branches"]["union"]
                  intersection: [mergeIntersectionDescendants<s>, "&"]
              }
              groups: s["groups"]
              unscanned: s["unscanned"]
          }>

export type mergeIntersectionDescendants<s extends StaticWithRoot> = maybePush<
    s["branches"]["intersection"],
    s["root"]
>

export const mergeIntersectionDescendantsToRoot = (s: DynamicWithRoot) => {
    if (stateHasOpenRange(s)) {
        return unpairedLeftBoundError(s)
    }
    if (!s.branches.intersection) {
        return s
    }
    s.root = compileIntersection(s.branches.intersection)
    delete s.branches.intersection
    return s
}

const compileIntersection = (branches: Attributes[]) => {
    while (branches.length > 1) {
        branches.unshift(intersect(branches.pop()!, branches.pop()!))
    }
    return branches[0]
}
