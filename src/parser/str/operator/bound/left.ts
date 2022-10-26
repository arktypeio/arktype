import type { Attributes } from "../../../../attributes/attributes.js"
import { isKeyOf } from "../../../../utils/generics.js"
import type { NumberLiteral } from "../../operand/numeric.js"
import { ParserState } from "../../state/state.js"
import { Comparator } from "./comparator.js"

export namespace LeftBoundOperator {
    export const reduce = (
        s: ParserState.WithRoot<{ value: number }>,
        comparator: Comparator.Token
    ) =>
        isKeyOf(comparator, Comparator.pairableTokens)
            ? ParserState.openLeftBounded(s)
                ? ParserState.error(
                      buildBoundLiteralMessage(
                          s.root.toString(),
                          String(s.branches.leftBound[0]),
                          s.branches.leftBound[1]
                      )
                  )
                : reduceValidated(s, comparator)
            : ParserState.error(
                  Comparator.buildInvalidDoubleMessage(comparator)
              )

    export type reduce<
        s extends ParserState.T.WithRoot<{ value: number }>,
        comparator extends Comparator.Token
    > = comparator extends Comparator.PairableToken
        ? s extends ParserState.openLeftBounded
            ? ParserState.error<
                  buildBoundLiteralMessage<
                      s["root"],
                      s["branches"]["leftBound"][0],
                      s["branches"]["leftBound"][1]
                  >
              >
            : reduceValidated<s, comparator>
        : ParserState.error<Comparator.buildInvalidDoubleMessage<comparator>>

    const reduceValidated = (
        s: ParserState.WithRoot<{ value: number }>,
        token: Comparator.PairableToken
    ) => {
        s.branches.leftBound = [s.root.value, token]
        s.root = ParserState.unset
        return s
    }

    type reduceValidated<
        s extends ParserState.T.WithRoot<{ value: number }>,
        comparator extends Comparator.PairableToken
    > = ParserState.from<{
        root: null
        branches: {
            union: s["branches"]["union"]
            intersection: s["branches"]["intersection"]
            leftBound: [s["root"]["value"], comparator]
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
            toString<s["root"]>,
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
                s.root.toString(),
                s.branches.leftBound[0],
                s.branches.leftBound[1]
            )
        )

    export const buildBoundLiteralMessage = <
        literal extends NumberLiteral,
        limit extends number,
        token extends Comparator.Token
    >(
        literal: literal,
        limit: limit,
        comparator: token
    ): buildBoundLiteralMessage<literal, limit, token> =>
        `Literal value '${literal}' cannot be bound by ${limit}${comparator}.`

    export type buildBoundLiteralMessage<
        literal extends NumberLiteral,
        limit extends number,
        comparator extends Comparator.Token
    > = `Literal value '${literal}' cannot be bound by ${limit}${comparator}.`

    export const buildUnpairedMessage = <
        root extends string,
        limit extends number,
        token extends Comparator.Token
    >(
        root: root,
        limit: limit,
        comparator: token
    ): buildUnpairedMessage<root, limit, token> =>
        `Left bounds are only valid when paired with right bounds. Consider using ${root}${Comparator.invertedTokens[comparator]}${limit} instead.`

    export type buildUnpairedMessage<
        root extends string,
        limit extends number,
        token extends Comparator.Token
    > = `Left bounds are only valid when paired with right bounds. Consider using ${root}${Comparator.InvertedTokens[token]}${limit} instead.`
}
