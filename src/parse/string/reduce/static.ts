import type {
    Comparator,
    InvertedComparators,
    MaxComparator,
    MinComparator
} from "../../../nodes/rules/range.ts"
import type { defined, error } from "../../../utils/generics.ts"
import type { NumberLiteral } from "../../../utils/numericLiterals.ts"
import type { astToString } from "../../ast/utils.ts"
import type { Scanner } from "../shift/scanner.ts"
import type {
    unclosedGroupMessage,
    writeMultipleLeftBoundsMessage,
    writeOpenRangeMessage,
    writeUnmatchedGroupCloseMessage,
    writeUnpairableComparatorMessage
} from "./shared.ts"

export type StaticState = {
    root: unknown
    branches: BranchState
    groups: BranchState[]
    unscanned: string
}

type StaticOpenLeftBound = { limit: NumberLiteral; comparator: MinComparator }

type BranchState = {
    range: StaticOpenLeftBound | undefined
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
        limit extends NumberLiteral,
        comparator extends Comparator,
        unscanned extends string
    > = comparator extends "<" | "<="
        ? s["branches"]["range"] extends {}
            ? error<
                  writeMultipleLeftBoundsMessage<
                      s["branches"]["range"]["limit"],
                      s["branches"]["range"]["comparator"],
                      limit,
                      InvertedComparators[comparator]
                  >
              >
            : from<{
                  root: undefined
                  branches: {
                      range: {
                          limit: limit
                          comparator: InvertedComparators[comparator]
                      }
                      "&": s["branches"]["&"]
                      "|": s["branches"]["|"]
                  }
                  groups: s["groups"]
                  unscanned: unscanned
              }>
        : error<writeUnpairableComparatorMessage<comparator>>

    export type reduceRange<
        s extends StaticState,
        minLimit extends NumberLiteral,
        minComparator extends MinComparator,
        maxComparator extends MaxComparator,
        maxLimit extends NumberLiteral,
        unscanned extends string
    > = state.from<{
        root: [minLimit, minComparator, [s["root"], maxComparator, maxLimit]]
        branches: {
            range: undefined
            "&": s["branches"]["&"]
            "|": s["branches"]["|"]
        }
        groups: s["groups"]
        unscanned: unscanned
    }>

    export type reduceSingleBound<
        s extends StaticState,
        comparator extends Comparator,
        limit extends NumberLiteral,
        unscanned extends string
    > = state.from<{
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
    > = s["branches"]["range"] extends {}
        ? openRangeError<s["branches"]["range"]>
        : s["groups"] extends popGroup<infer stack, infer top>
        ? from<{
              groups: stack
              branches: top
              root: mergeToUnion<s>
              unscanned: unscanned
          }>
        : error<writeUnmatchedGroupCloseMessage<unscanned>>

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
        writeOpenRangeMessage<range["limit"], range["comparator"]>
    >

    export type previousOperator<s extends StaticState> =
        s["branches"]["range"] extends {}
            ? s["branches"]["range"]["comparator"]
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
