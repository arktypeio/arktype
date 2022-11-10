import { isKeyOf } from "../../../utils/generics.js"
import type { NumberLiteral } from "../../../utils/numericLiterals.js"
import { parseWellFormedNumber } from "../../../utils/numericLiterals.js"
import type { DynamicState } from "../../state/dynamic.js"
import { Scanner } from "../../state/scanner.js"
import type {
    OpenRange,
    state,
    StaticState,
    StaticWithOpenRange,
    StaticWithRoot
} from "../../state/static.js"
import type { InvertedComparators } from "./shared.js"
import {
    buildInvalidDoubleBoundMessage,
    invertedComparators
} from "./shared.js"

export const parseLeftBound = (
    s: DynamicState,
    comparator: Scanner.Comparator
) =>
    isKeyOf(comparator, Scanner.pairableComparators)
        ? s.hasOpenRange(s)
            ? s.error(
                  buildBoundLiteralMessage(
                      s.root.get.value,
                      s.branches.range[0],
                      s.branches.range[1]
                  )
              )
            : parseValidated(s, comparator)
        : s.error(buildInvalidDoubleBoundMessage(comparator))

export type parseLeftBound<
    s extends StaticWithRoot<number>,
    comparator extends Scanner.Comparator
> = comparator extends Scanner.PairableComparator
    ? s extends StaticWithOpenRange
        ? state.error<
              buildBoundLiteralMessage<
                  `${s["root"]}`,
                  s["branches"]["range"][0],
                  s["branches"]["range"][1]
              >
          >
        : parseValidated<s, comparator>
    : state.error<buildInvalidDoubleBoundMessage<comparator>>

const parseValidated = (
    s: DynamicState<{ value: NumberLiteral }>,
    token: Scanner.PairableComparator
) => {
    s.branches.range = [
        parseWellFormedNumber(s.root.eject().value, true),
        token
    ]
    return s
}

type parseValidated<
    s extends StaticWithRoot<number>,
    comparator extends Scanner.PairableComparator
> = state.from<{
    root: undefined
    branches: {
        range: [s["root"], comparator]
        union: s["branches"]["union"]
        intersection: s["branches"]["intersection"]
    }
    groups: s["groups"]
    unscanned: s["unscanned"]
}>

export type unpairedLeftBoundError<
    s extends StaticState<{
        root: {}
        branches: { range: OpenRange }
    }>
> = errorState<
    buildUnpairedLeftBoundMessage<
        s["branches"]["range"][0],
        s["branches"]["range"][1]
    >
>

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

export const buildUnpairedLeftBoundMessage = <
    limit extends number,
    comparator extends Scanner.Comparator
>(
    limit: limit,
    comparator: comparator
): buildUnpairedLeftBoundMessage<limit, comparator> =>
    `Left bounds are only valid when paired with right bounds (try ...${invertedComparators[comparator]}${limit})`

export type buildUnpairedLeftBoundMessage<
    limit extends number,
    comparator extends Scanner.Comparator
> = `Left bounds are only valid when paired with right bounds (try ...${InvertedComparators[comparator]}${limit})`
