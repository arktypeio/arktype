import type {
    MaxComparator,
    MinComparator
} from "../../../nodes/rules/range.js"
import type { defined, error, stringKeyOf } from "../../../utils/generics.js"
import type { NumberLiteral } from "../../../utils/numericLiterals.js"
import type { Scanner } from "../shift/scanner.js"
import type {
    unclosedGroupMessage,
    writeMultipleLeftBoundsMessage,
    writeOpenRangeMessage,
    writeUnmatchedGroupCloseMessage,
    writeUnpairableComparatorMessage
} from "./shared.js"

export type StaticState = {
    root: unknown
    branches: BranchState
    groups: BranchState[]
    scanned: string
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
        scanned: ""
        unscanned: def
    }>

    type initialBranches = branchesFrom<{
        range: undefined
        "&": undefined
        "|": undefined
    }>

    type updateScanned<
        previousScanned extends string,
        previousUnscanned extends string,
        updatedUnscanned extends string
    > = previousUnscanned extends `${infer justScanned}${updatedUnscanned}`
        ? `${previousScanned}${justScanned}`
        : previousScanned

    export type setRoot<
        s extends StaticState,
        root,
        unscanned extends string
    > = from<{
        root: root
        branches: s["branches"]
        groups: s["groups"]
        scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>
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
              scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>
              unscanned: unscanned
          }>

    export type reduceLeftBound<
        s extends StaticState,
        limit extends NumberLiteral,
        comparator extends Scanner.Comparator,
        unscanned extends string
    > = comparator extends "<" | "<="
        ? s["branches"]["range"] extends {}
            ? error<
                  writeMultipleLeftBoundsMessage<
                      s["branches"]["range"]["limit"],
                      s["branches"]["range"]["comparator"],
                      limit,
                      Scanner.InvertedComparators[comparator]
                  >
              >
            : from<{
                  root: undefined
                  branches: {
                      range: {
                          limit: limit
                          comparator: Scanner.InvertedComparators[comparator]
                      }
                      "&": s["branches"]["&"]
                      "|": s["branches"]["|"]
                  }
                  groups: s["groups"]
                  scanned: updateScanned<
                      s["scanned"],
                      s["unscanned"],
                      unscanned
                  >
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
        scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>
        unscanned: unscanned
    }>

    export type reduceSingleBound<
        s extends StaticState,
        comparator extends Scanner.Comparator,
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
        scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>
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
              scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>
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
        scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>
        unscanned: unscanned
    }>

    export type finalize<s extends StaticState> = s["groups"] extends []
        ? s["branches"]["range"] extends {}
            ? openRangeError<s["branches"]["range"]>
            : from<{
                  root: mergeToUnion<s>
                  groups: s["groups"]
                  branches: initialBranches
                  scanned: s["scanned"]
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
        scanned: updateScanned<s["scanned"], s["unscanned"], unscanned>
        unscanned: unscanned
    }>

    export type from<s extends StaticState> = s

    export type branchesFrom<b extends BranchState> = b
}
