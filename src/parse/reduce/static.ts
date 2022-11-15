import type { defined, error } from "../../utils/generics.js"
import type { astToString } from "../ast.js"
import type { Scanner } from "./scanner.js"
import type {
    buildOpenRangeMessage,
    buildUnmatchedGroupCloseMessage,
    buildUnpairableComparatorMessage,
    OpenRange,
    unclosedGroupMessage
} from "./shared.js"

export type StaticState = {
    root: unknown
    branches: BranchState
    groups: BranchState[]
    unscanned: string
}

type BranchState = {
    range: OpenRange | undefined
    "&": unknown
    "|": unknown
}

export namespace state {
    export type initialize<def extends string> = from<{
        root: undefined
        branches: initialBranches
        groups: []
        unscanned: def
    }>

    type initialBranches = branchesFrom<{
        range: undefined
        "&": undefined
        "|": undefined
    }>

    export type setRoot<
        s extends StaticState,
        root,
        unscanned extends string
    > = from<{
        root: root
        branches: s["branches"]
        groups: s["groups"]
        unscanned: unscanned
    }>

    export type reduceBranch<
        s extends StaticState,
        token extends Scanner.BranchToken,
        unscanned extends string
    > = s["branches"]["range"] extends {}
        ? openRangeError<s["branches"]["range"]>
        : from<{
              root: undefined
              branches: {
                  range: undefined
                  "&": token extends "&" ? mergeToIntersection<s> : undefined
                  "|": token extends "|" ? mergeToUnion<s> : s["branches"]["|"]
              }
              groups: s["groups"]
              unscanned: unscanned
          }>

    export type reduceLeftBound<
        s extends StaticState,
        limit extends number,
        comparator extends Scanner.Comparator
    > = comparator extends Scanner.PairableComparator
        ? from<{
              root: undefined
              branches: {
                  range: [limit, comparator]
                  "&": s["branches"]["&"]
                  "|": s["branches"]["|"]
              }
              groups: s["groups"]
              unscanned: s["unscanned"]
          }>
        : error<buildUnpairableComparatorMessage<comparator>>

    export type reduceRightBound<
        s extends StaticState,
        comparator extends Scanner.Comparator,
        limit extends number,
        unscanned extends string
    > = s["branches"]["range"] extends {}
        ? comparator extends Scanner.PairableComparator
            ? state.from<{
                  root: [
                      s["branches"]["range"][0],
                      s["branches"]["range"][1],
                      [s["root"], comparator, limit]
                  ]
                  branches: {
                      range: undefined
                      "&": s["branches"]["&"]
                      "|": s["branches"]["|"]
                  }
                  groups: s["groups"]
                  unscanned: unscanned
              }>
            : error<buildUnpairableComparatorMessage<comparator>>
        : state.from<{
              root: [s["root"], comparator, limit]
              branches: {
                  range: undefined
                  "&": s["branches"]["&"]
                  "|": s["branches"]["|"]
              }
              groups: s["groups"]
              unscanned: unscanned
          }>

    type mergeToUnion<s extends StaticState> =
        s["branches"]["|"] extends undefined
            ? mergeToIntersection<s>
            : [s["branches"]["|"], "|", mergeToIntersection<s>]

    type mergeToIntersection<s extends StaticState> =
        s["branches"]["&"] extends undefined
            ? s["root"]
            : [s["branches"]["&"], "&", s["root"]]

    type popGroup<stack extends BranchState[], top extends BranchState> = [
        ...stack,
        top
    ]

    export type finalizeGroup<
        s extends StaticState,
        unscanned extends string
    > = s["groups"] extends popGroup<infer stack, infer top>
        ? from<{
              groups: stack
              branches: top
              root: mergeToUnion<s>
              unscanned: unscanned
          }>
        : error<buildUnmatchedGroupCloseMessage<s["unscanned"]>>

    export type reduceGroupOpen<
        s extends StaticState,
        unscanned extends string
    > = from<{
        groups: [...s["groups"], s["branches"]]
        branches: initialBranches
        root: undefined
        unscanned: unscanned
    }>

    export type finalize<s extends StaticState> = s["groups"] extends []
        ? s["branches"]["range"] extends {}
            ? openRangeError<s["branches"]["range"]>
            : from<{
                  root: mergeToUnion<s>
                  groups: s["groups"]
                  branches: initialBranches
                  unscanned: Scanner.finalized
              }>
        : error<unclosedGroupMessage>

    type openRangeError<range extends defined<BranchState["range"]>> = error<
        buildOpenRangeMessage<range[0], range[1]>
    >

    export type previousOperator<s extends StaticState> =
        s["branches"]["range"] extends {}
            ? s["branches"]["range"][1]
            : s["branches"]["&"] extends {}
            ? "&"
            : s["branches"]["|"] extends {}
            ? "|"
            : undefined

    export type scanTo<s extends StaticState, unscanned extends string> = from<{
        root: s["root"]
        branches: s["branches"]
        groups: s["groups"]
        unscanned: unscanned
    }>

    export type toString<s extends StaticState> = astToString<mergeToUnion<s>>

    export type from<s extends StaticState> = s

    export type branchesFrom<b extends BranchState> = b
}
