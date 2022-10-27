import { Attributes } from "../../../attributes/attributes.js"
import type { maybePush } from "../../common.js"
import type { StaticState } from "../state/state.js"
import { DynamicState } from "../state/state.js"
import type { LeftBoundOperator } from "./bound/left.js"
import { IntersectionOperator } from "./intersection.js"

export namespace UnionOperator {
    export const parse = (s: DynamicState.WithRoot) => {
        IntersectionOperator.mergeDescendantsToRootIfPresent(s)
        s.branches.union = s.branches.union
            ? Attributes.reduce("union", s.branches.union, s.root)
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
                      intersection: null
                      union: [collectBranches<s>, "|"]
                  }
                  groups: s["groups"]
                  unscanned: s["unscanned"]
              }>

    export type collectBranches<s extends StaticState.WithRoot> = maybePush<
        s["branches"]["union"],
        IntersectionOperator.collectBranches<s>
    >

    export const mergeDescendantsToRootIfPresent = (
        s: DynamicState.WithRoot
    ) => {
        IntersectionOperator.mergeDescendantsToRootIfPresent(s)
        if (!s.branches.union) {
            return s
        }
        s.root = Attributes.reduce("union", s.branches.union, s.root)
        delete s.branches.union
        return s
    }
}
