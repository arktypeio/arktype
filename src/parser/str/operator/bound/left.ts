import type { Attributes } from "../../../../attributes/attributes.js"
import { isKeyOf } from "../../../../utils/generics.js"
import { Scanner } from "../../state/scanner.js"
import { ParserState } from "../../state/state.js"
import type { InvertedComparators } from "./shared.js"
import { buildInvalidDoubleMessage, invertedComparators } from "./shared.js"

export namespace LeftBoundOperator {
    export const reduce = (
        s: ParserState.WithRoot<{ value: number }>,
        comparator: Scanner.Comparator
    ) =>
        isKeyOf(comparator, Scanner.pairableComparators)
            ? ParserState.openLeftBounded(s)
                ? ParserState.error(
                      buildBoundLiteralMessage(
                          s.root.value,
                          s.branches.leftBound[0],
                          s.branches.leftBound[1]
                      )
                  )
                : reduceValidated(s, comparator)
            : ParserState.error(buildInvalidDoubleMessage(comparator))

    export type reduce<
        s extends ParserState.T.WithRoot<number>,
        comparator extends Scanner.Comparator
    > = comparator extends Scanner.PairableComparator
        ? s extends ParserState.openLeftBounded
            ? ParserState.error<
                  buildBoundLiteralMessage<
                      s["root"],
                      s["branches"]["leftBound"][0],
                      s["branches"]["leftBound"][1]
                  >
              >
            : reduceValidated<s, comparator>
        : ParserState.error<buildInvalidDoubleMessage<comparator>>

    const reduceValidated = (
        s: ParserState.WithRoot<{ value: number }>,
        token: Scanner.PairableComparator
    ) => {
        s.branches.leftBound = [s.root.value, token]
        s.root = ParserState.unset
        return s
    }

    type reduceValidated<
        s extends ParserState.T.WithRoot<number>,
        comparator extends Scanner.PairableComparator
    > = ParserState.from<{
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
        s extends ParserState.T.Unfinished<{
            root: {}
            branches: { leftBound: ParserState.OpenLeftBound }
        }>
    > = ParserState.error<
        buildUnpairedMessage<
            s["branches"]["leftBound"][0],
            s["branches"]["leftBound"][1]
        >
    >

    export const unpairedError = (
        s: ParserState.Of<{
            root: Attributes
            branches: { leftBound: ParserState.OpenLeftBound }
        }>
    ) =>
        ParserState.error(
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
