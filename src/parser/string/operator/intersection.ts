import { Attributes } from "../../../attributes/attributes.js"
import type { maybePush } from "../../common.js"
import type { StaticState } from "../state/state.js"
import { DynamicState } from "../state/state.js"
import { LeftBoundOperator } from "./bound/left.js"

export namespace IntersectionOperator {
    export const parse = (s: DynamicState.WithRoot) => {
        if (DynamicState.hasOpenLeftBound(s)) {
            return LeftBoundOperator.unpairedError(s)
        }
        s.branches.intersection = s.branches.intersection
            ? Attributes.reduce("intersection", s.branches.intersection, s.root)
            : s.root
        s.root = DynamicState.unset
        return s
    }

    export type parse<s extends StaticState.WithRoot> =
        s extends StaticState.WithOpenLeftBound
            ? LeftBoundOperator.unpairedError<s>
            : StaticState.from<{
                  root: null
                  branches: {
                      leftBound: null
                      union: s["branches"]["union"]
                      intersection: [collectBranches<s>, "&"]
                  }
                  groups: s["groups"]
                  unscanned: s["unscanned"]
              }>

    export type collectBranches<s extends StaticState.WithRoot> = maybePush<
        s["branches"]["intersection"],
        s["root"]
    >

    export const mergeDescendantsToRootIfPresent = (
        s: DynamicState.WithRoot
    ) => {
        if (DynamicState.hasOpenLeftBound(s)) {
            return LeftBoundOperator.unpairedError(s)
        }
        if (!s.branches.intersection) {
            return s
        }
        s.root = Attributes.reduce(
            "intersection",
            s.branches.intersection,
            s.root
        )
        delete s.branches.intersection
        return s
    }
}
