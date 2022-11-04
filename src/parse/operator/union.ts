import type { maybePush } from "../common.js"
import type { Attributes } from "../state/attributes.js"
import { State } from "../state/state.js"
import type { LeftBound } from "./bounds/left.js"
import { Intersection } from "./intersection.js"

export namespace Union {
    export const parse = (s: State.DynamicWithRoot) => {
        Intersection.mergeDescendantsToRootIfPresent(s)
        s.branches.union ??= []
        s.branches.union.push(s.root)
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
                      intersection: undefined
                      union: [collectBranches<s>, "|"]
                  }
                  groups: s["groups"]
                  unscanned: s["unscanned"]
              }>

    export type collectBranches<s extends State.StaticWithRoot> = maybePush<
        s["branches"]["union"],
        Intersection.collectBranches<s>
    >

    export const mergeDescendantsToRootIfPresent = (
        s: State.DynamicWithRoot
    ) => {
        Intersection.mergeDescendantsToRootIfPresent(s)
        if (!s.branches.union) {
            return s
        }
        s.branches.union.push(s.root)
        s.root = compress(s.branches.union)
        delete s.branches.union
        return s
    }

    const testBranches: Attributes[] = [
        { type: "dictionary", props: { a: { type: "string" } } },
        {
            type: "dictionary",
            props: { a: { type: "string" } },
            requiredKeys: { a: true }
        },
        { type: "dictionary", props: { a: { type: "number" } } }
    ]

    const desiredCompression: Attributes = {
        type: "dictionary",
        branches: [
            "|",
            { props: { a: { type: "string" } } },
            { props: { a: { type: "number" } } }
        ]
    }

    const compress = (branches: Attributes[]): Attributes => {
        return { branches: ["|", ...branches] }
    }
}
