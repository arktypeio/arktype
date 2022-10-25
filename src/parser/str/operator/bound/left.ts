import type { toString } from "../../../../nodes/ast/toString.js"
import type { Base } from "../../../../nodes/base/base.js"
import { Bound } from "../../../../nodes/expression/infix/bound.js"
import type { NumberLiteral } from "../../../../nodes/terminal/literal/number.js"
import { isKeyOf } from "../../../../utils/generics.js"
import { ParserState } from "../../state/state.js"
import { Comparator } from "./tokens.js"

export namespace LeftBoundOperator {
    export const reduce = (
        s: ParserState.WithRoot<NumberLiteral.Node>,
        comparator: Bound.Token
    ) =>
        isKeyOf(comparator, Bound.doublableTokens)
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
        s extends ParserState.T.WithRoot<NumberLiteral.Definition>,
        comparator extends Bound.Token
    > = comparator extends Bound.DoublableToken
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
        s: ParserState.WithRoot<NumberLiteral.Node>,
        token: Bound.DoublableToken
    ) => {
        s.branches.leftBound = [s.root.value, token]
        s.root = null as any
        return s
    }

    type reduceValidated<
        s extends ParserState.T.WithRoot<NumberLiteral.Definition>,
        comparator extends Bound.DoublableToken
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
            branches: { leftBound: ParserState.T.OpenLeftBound }
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
            root: Base.Node
            branches: { leftBound: ParserState.OpenLeftBound }
        }>
    ) =>
        ParserState.error(
            buildUnpairedMessage(
                s.root.toString(),
                s.branches.leftBound[0].toString(),
                s.branches.leftBound[1]
            )
        )

    export const buildBoundLiteralMessage = <
        literal extends NumberLiteral.Definition,
        limit extends string,
        token extends Bound.Token
    >(
        literal: literal,
        limit: limit,
        comparator: token
    ): buildBoundLiteralMessage<literal, limit, token> =>
        `Literal value '${literal}' cannot be bound by ${limit}${comparator}.`

    export type buildBoundLiteralMessage<
        literal extends NumberLiteral.Definition,
        limit extends string,
        comparator extends Bound.Token
    > = `Literal value '${literal}' cannot be bound by ${limit}${comparator}.`

    export const buildUnpairedMessage = <
        root extends string,
        limit extends string,
        token extends Bound.Token
    >(
        root: root,
        limit: limit,
        comparator: token
    ): buildUnpairedMessage<root, limit, token> =>
        `Left bounds are only valid when paired with right bounds. Consider using ${root}${Bound.invertedComparators[comparator]}${limit} instead.`

    export type buildUnpairedMessage<
        root extends string,
        limit extends string,
        token extends Bound.Token
    > = `Left bounds are only valid when paired with right bounds. Consider using ${root}${Bound.InvertedComparators[token]}${limit} instead.`
}
