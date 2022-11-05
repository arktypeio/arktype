import { isKeyOf } from "../../../utils/generics.js"
import type { NumberLiteral } from "../../../utils/numericLiterals.js"
import { parseWellFormedNumber } from "../../../utils/numericLiterals.js"
import { Scanner } from "../../state/scanner.js"
import { State } from "../../state/state.js"
import type { InvertedComparators, MinString } from "./shared.js"
import { buildInvalidDoubleMessage, invertedComparators } from "./shared.js"

export namespace LeftBound {
    export const parse = (
        s: State.DynamicWithRoot<{ value: NumberLiteral }>,
        comparator: Scanner.Comparator
    ) =>
        isKeyOf(comparator, Scanner.pairableComparators)
            ? State.hasOpenRange(s)
                ? State.error(
                      buildBoundLiteralMessage(s.root.value, s.branches.range)
                  )
                : parseValidated(s, comparator)
            : State.error(buildInvalidDoubleMessage(comparator))

    export type parse<
        s extends State.StaticWithRoot<number>,
        comparator extends Scanner.Comparator
    > = comparator extends Scanner.PairableComparator
        ? s extends State.StaticWithOpenRange
            ? State.error<
                  buildBoundLiteralMessage<
                      `${s["root"]}`,
                      s["branches"]["range"]
                  >
              >
            : parseValidated<s, comparator>
        : State.error<buildInvalidDoubleMessage<comparator>>

    const parseValidated = (
        s: State.DynamicWithRoot<{ value: NumberLiteral }>,
        token: Scanner.PairableComparator
    ) => {
        s.branches.range = `${
            invertedComparators[token]
        }${parseWellFormedNumber(s.root.value, true)}`
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
            range: `${InvertedComparators[comparator]}${s["root"]}`
        }
        groups: s["groups"]
        unscanned: s["unscanned"]
    }>

    export type unpairedError<
        s extends State.Static<{
            root: {}
            branches: { range: MinString }
        }>
    > = State.error<buildUnpairedMessage<s["branches"]["range"]>>

    export const unpairedError = (
        s: State.Dynamic<{
            branches: { range: MinString }
        }>
    ) => State.error(buildUnpairedMessage(s.branches.range))

    export const buildBoundLiteralMessage = <
        literal extends NumberLiteral,
        openRange extends MinString
    >(
        literal: literal,
        openRange: openRange
    ): buildBoundLiteralMessage<literal, openRange> =>
        `Literal value '${literal}' cannot be bound by ${openRange}`

    export type buildBoundLiteralMessage<
        literal extends NumberLiteral,
        openRange extends MinString
    > = `Literal value '${literal}' cannot be bound by ${openRange}`

    const invertLeftBound = <LeftBound extends MinString>(
        leftBound: LeftBound
    ) => `<${leftBound.slice(1)}` as invertLeftBound<LeftBound>

    type invertLeftBound<leftBound extends MinString> =
        leftBound extends `>${infer rest} ` ? `<${rest}` : never

    export const buildUnpairedMessage = <LeftBound extends MinString>(
        leftBound: LeftBound
    ): buildUnpairedMessage<LeftBound> =>
        `Left bounds are only valid when paired with right bounds (try ${invertLeftBound(
            leftBound
        )})`

    export type buildUnpairedMessage<leftBound extends MinString> =
        `Left bounds are only valid when paired with right bounds (try ${invertLeftBound<leftBound>})`
}
