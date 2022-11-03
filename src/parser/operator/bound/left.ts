import { isKeyOf } from "../../../utils/generics.js"
import type { NumberLiteral } from "../../operand/numeric.js"
import { UnenclosedNumber } from "../../operand/numeric.js"
import { Scanner } from "../../state/scanner.js"
import { State } from "../../state/state.js"
import type { InvertedComparators } from "./shared.js"
import { buildInvalidDoubleMessage, invertedComparators } from "./shared.js"

export namespace LeftBoundOperator {
    export const parse = (
        s: State.DynamicWithRoot<{ value: NumberLiteral }>,
        comparator: Scanner.Comparator
    ) =>
        isKeyOf(comparator, Scanner.pairableComparators)
            ? State.hasOpenLeftBound(s)
                ? State.error(
                      buildBoundLiteralMessage(
                          s.root.value,
                          s.branches.leftBound[0],
                          s.branches.leftBound[1]
                      )
                  )
                : parseValidated(s, comparator)
            : State.error(buildInvalidDoubleMessage(comparator))

    export type parse<
        s extends State.StaticWithRoot<number>,
        comparator extends Scanner.Comparator
    > = comparator extends Scanner.PairableComparator
        ? s extends State.StaticWithOpenLeftBound
            ? State.error<
                  buildBoundLiteralMessage<
                      `${s["root"]}`,
                      s["branches"]["leftBound"][0],
                      s["branches"]["leftBound"][1]
                  >
              >
            : parseValidated<s, comparator>
        : State.error<buildInvalidDoubleMessage<comparator>>

    const parseValidated = (
        s: State.DynamicWithRoot<{ value: NumberLiteral }>,
        token: Scanner.PairableComparator
    ) => {
        s.branches.leftBound = [
            UnenclosedNumber.parseWellFormed(s.root.value, "number", true),
            token
        ]
        s.root = State.unset
        return s
    }

    type parseValidated<
        s extends State.StaticWithRoot<number>,
        comparator extends Scanner.PairableComparator
    > = State.from<{
        root: undefined
        branches: {
            union: s["branches"]["union"]
            intersection: s["branches"]["intersection"]
            leftBound: [s["root"], comparator]
        }
        groups: s["groups"]
        unscanned: s["unscanned"]
    }>

    export type unpairedError<
        s extends State.Static<{
            root: {}
            branches: { leftBound: State.OpenLeftBound }
        }>
    > = State.error<
        buildUnpairedMessage<
            s["branches"]["leftBound"][0],
            s["branches"]["leftBound"][1]
        >
    >

    export const unpairedError = (
        s: State.Dynamic<{
            branches: { leftBound: State.OpenLeftBound }
        }>
    ) =>
        State.error(
            buildUnpairedMessage(
                s.branches.leftBound[0],
                s.branches.leftBound[1]
            )
        )

    export const buildBoundLiteralMessage = <
        literal extends NumberLiteral,
        limit extends number,
        token extends Scanner.Comparator
    >(
        literal: literal,
        limit: limit,
        comparator: token
    ): buildBoundLiteralMessage<literal, limit, token> =>
        `Literal value '${literal}' cannot be bound by ${limit}${comparator}`

    export type buildBoundLiteralMessage<
        literal extends NumberLiteral,
        limit extends number,
        comparator extends Scanner.Comparator
    > = `Literal value '${literal}' cannot be bound by ${limit}${comparator}`

    export const buildUnpairedMessage = <
        limit extends number,
        comparator extends Scanner.Comparator
    >(
        limit: limit,
        comparator: comparator
    ): buildUnpairedMessage<limit, comparator> =>
        `Left bounds are only valid when paired with right bounds. Consider using ${invertedComparators[comparator]}${limit} instead`

    export type buildUnpairedMessage<
        limit extends number,
        comparator extends Scanner.Comparator
    > = `Left bounds are only valid when paired with right bounds. Consider using ${InvertedComparators[comparator]}${limit} instead`
}
