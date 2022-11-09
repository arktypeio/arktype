import { isKeyOf } from "../../../utils/generics.js"
import type { NumberLiteral } from "../../../utils/numericLiterals.js"
import { parseWellFormedNumber } from "../../../utils/numericLiterals.js"
import { Scanner } from "../../state/scanner.js"
import { State } from "../../state/state.js"
import type { InvertedComparators } from "./shared.js"
import {
    buildInvalidDoubleBoundMessage,
    invertedComparators
} from "./shared.js"

export const parseLeftBound = (
    s: State.DynamicWithRoot<{ value: NumberLiteral }>,
    comparator: Scanner.Comparator
) =>
    isKeyOf(comparator, Scanner.pairableComparators)
        ? State.hasOpenRange(s)
            ? State.error(
                  buildBoundLiteralMessage(
                      s.root.value,
                      s.branches.range[0],
                      s.branches.range[1]
                  )
              )
            : parseValidated(s, comparator)
        : State.error(buildInvalidDoubleBoundMessage(comparator))

export type parseLeftBound<
    s extends State.StaticWithRoot<number>,
    comparator extends Scanner.Comparator
> = comparator extends Scanner.PairableComparator
    ? s extends State.StaticWithOpenRange
        ? State.error<
              buildBoundLiteralMessage<
                  `${s["root"]}`,
                  s["branches"]["range"][0],
                  s["branches"]["range"][1]
              >
          >
        : parseValidated<s, comparator>
    : State.error<buildInvalidDoubleBoundMessage<comparator>>

const parseValidated = (
    s: State.DynamicWithRoot<{ value: NumberLiteral }>,
    token: Scanner.PairableComparator
) => {
    s.branches.range = [parseWellFormedNumber(s.root.value, true), token]
    s.root = State.unset
    return s
}

type parseValidated<
    s extends State.StaticWithRoot<number>,
    comparator extends Scanner.PairableComparator
> = State.from<{
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
    s extends State.Static<{
        root: {}
        branches: { range: State.OpenRange }
    }>
> = State.error<
    buildUnpairedLeftBoundMessage<
        s["branches"]["range"][0],
        s["branches"]["range"][1]
    >
>

export const unpairedLeftBoundError = (
    s: State.Dynamic<{
        branches: { range: State.OpenRange }
    }>
) =>
    State.error(
        buildUnpairedLeftBoundMessage(s.branches.range[0], s.branches.range[1])
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
