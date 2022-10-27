import { isKeyOf } from "../../../../utils/generics.js"
import { Scanner } from "../../state/scanner.js"
import type { StaticState } from "../../state/state.js"
import { DynamicState } from "../../state/state.js"
import type { InvertedComparators } from "./shared.js"
import { buildInvalidDoubleMessage, invertedComparators } from "./shared.js"

export namespace LeftBoundOperator {
    export const parse = (
        s: DynamicState.WithRoot<{ value: number }>,
        comparator: Scanner.Comparator
    ) =>
        isKeyOf(comparator, Scanner.pairableComparators)
            ? DynamicState.hasOpenLeftBound(s)
                ? DynamicState.error(
                      buildBoundLiteralMessage(
                          s.root.value,
                          s.branches.leftBound[0],
                          s.branches.leftBound[1]
                      )
                  )
                : parseValidated(s, comparator)
            : DynamicState.error(buildInvalidDoubleMessage(comparator))

    export type parse<
        s extends StaticState.WithRoot<number>,
        comparator extends Scanner.Comparator
    > = comparator extends Scanner.PairableComparator
        ? s extends StaticState.WithOpenLeftBound
            ? StaticState.error<
                  buildBoundLiteralMessage<
                      s["root"],
                      s["branches"]["leftBound"][0],
                      s["branches"]["leftBound"][1]
                  >
              >
            : parseValidated<s, comparator>
        : StaticState.error<buildInvalidDoubleMessage<comparator>>

    const parseValidated = (
        s: DynamicState.WithRoot<{ value: number }>,
        token: Scanner.PairableComparator
    ) => {
        s.branches.leftBound = [s.root.value, token]
        s.root = DynamicState.unset
        return s
    }

    type parseValidated<
        s extends StaticState.WithRoot<number>,
        comparator extends Scanner.PairableComparator
    > = StaticState.from<{
        root: null
        branches: {
            union: s["branches"]["union"]
            intersection: s["branches"]["intersection"]
            leftBound: [s["root"], comparator]
        }
        groups: s["groups"]
        unscanned: s["unscanned"]
    }>

    export type unpairedError<
        s extends StaticState<{
            root: {}
            branches: { leftBound: DynamicState.OpenLeftBound }
        }>
    > = StaticState.error<
        buildUnpairedMessage<
            s["branches"]["leftBound"][0],
            s["branches"]["leftBound"][1]
        >
    >

    export const unpairedError = (
        s: DynamicState<{
            branches: { leftBound: DynamicState.OpenLeftBound }
        }>
    ) =>
        DynamicState.error(
            buildUnpairedMessage(
                s.branches.leftBound[0],
                s.branches.leftBound[1]
            )
        )

    export const buildBoundLiteralMessage = <
        literal extends number,
        limit extends number,
        token extends Scanner.Comparator
    >(
        literal: literal,
        limit: limit,
        comparator: token
    ): buildBoundLiteralMessage<literal, limit, token> =>
        `Literal value '${literal}' cannot be bound by ${limit}${comparator}.`

    export type buildBoundLiteralMessage<
        literal extends number,
        limit extends number,
        comparator extends Scanner.Comparator
    > = `Literal value '${literal}' cannot be bound by ${limit}${comparator}.`

    export const buildUnpairedMessage = <
        limit extends number,
        comparator extends Scanner.Comparator
    >(
        limit: limit,
        comparator: comparator
    ): buildUnpairedMessage<limit, comparator> =>
        `Left bounds are only valid when paired with right bounds. Consider using ${invertedComparators[comparator]}${limit} instead.`

    export type buildUnpairedMessage<
        limit extends number,
        comparator extends Scanner.Comparator
    > = `Left bounds are only valid when paired with right bounds. Consider using ${InvertedComparators[comparator]}${limit} instead.`
}
