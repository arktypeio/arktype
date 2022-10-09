import { isKeyOf } from "@re-/tools"
import { Bound } from "../../../../nodes/expression/infix/bound.js"
import type { PrimitiveLiteral } from "../../../../nodes/terminal/primitiveLiteral.js"
import type { toString } from "../../../../nodes/traverse/ast/toString.js"
import { ParserState } from "../../state/state.js"
import { Comparators } from "./tokens.js"

export namespace LeftBoundOperator {
    export const reduce = (
        s: ParserState.WithRoot<PrimitiveLiteral.Node<number>>,
        comparator: Bound.Token
    ) =>
        isKeyOf(comparator, Bound.doubleTokens)
            ? reduceValidated(s, comparator)
            : ParserState.error(
                  Comparators.buildInvalidDoubleMessage(comparator)
              )

    export type reduce<
        s extends ParserState.T.WithRoot<PrimitiveLiteral.Number>,
        comparator extends Bound.Token
    > = comparator extends Bound.DoubleToken
        ? reduceValidated<s, comparator>
        : ParserState.error<Comparators.buildInvalidDoubleMessage<comparator>>

    const reduceValidated = (
        s: ParserState.WithRoot<PrimitiveLiteral.Node<number>>,
        token: Bound.DoubleToken
    ) => {
        s.branches.leftBound = [s.root, token]
        s.root = undefined as any
        return s
    }

    type reduceValidated<
        s extends ParserState.T.WithRoot<PrimitiveLiteral.Number>,
        comparator extends Bound.DoubleToken
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

    export const assertClosed = (s: ParserState.WithRoot) =>
        s.branches.leftBound
            ? ParserState.error(
                  buildUnpairedMessage(
                      s.root.toString(),
                      s.branches.leftBound[0].toString(),
                      s.branches.leftBound[1]
                  )
              )
            : s

    export type assertClosed<s extends ParserState.T.WithRoot> =
        s["branches"]["leftBound"] extends ParserState.T.OpenLeftBound
            ? ParserState.error<
                  buildUnpairedMessage<
                      toString<s["root"]>,
                      s["branches"]["leftBound"][0],
                      s["branches"]["leftBound"][1]
                  >
              >
            : s

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
