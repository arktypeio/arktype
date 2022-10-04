import { isKeyOf } from "@re-/tools"
import { Bound } from "../../../../nodes/expression/bound.js"
import type { PrimitiveLiteral } from "../../../../nodes/terminal/primitiveLiteral.js"
import type { Ast } from "../../../../nodes/traverse/ast.js"
import type { ParserState } from "../../state/state.js"
import { parserState } from "../../state/state.js"
import { Comparators } from "./tokens.js"

export namespace LeftBoundOperator {
    export const reduce = (
        s: parserState.WithRoot<PrimitiveLiteral.Node<number>>,
        comparator: Bound.Token
    ) =>
        isKeyOf(comparator, Bound.doubleTokens)
            ? reduceValidated(s, comparator)
            : parserState.error(
                  Comparators.buildInvalidDoubleMessage(comparator)
              )

    export type reduce<
        s extends ParserState.WithRoot<PrimitiveLiteral.Number>,
        comparator extends Bound.Token
    > = comparator extends Bound.DoubleToken
        ? reduceValidated<s, comparator>
        : ParserState.error<Comparators.buildInvalidDoubleMessage<comparator>>

    const reduceValidated = (
        s: parserState.WithRoot<PrimitiveLiteral.Node<number>>,
        token: Bound.DoubleToken
    ) => {
        s.branches.leftBound = [s.root, token]
        s.root = undefined as any
        return s
    }

    type reduceValidated<
        s extends ParserState.WithRoot<PrimitiveLiteral.Number>,
        comparator extends Bound.DoubleToken
    > = ParserState.from<{
        groups: s["groups"]
        branches: {
            union: s["branches"]["union"]
            intersection: s["branches"]["intersection"]
            leftBound: [s["root"], comparator]
        }
        root: undefined
        unscanned: s["unscanned"]
    }>

    export const assertClosed = (s: parserState.WithRoot) =>
        s.branches.leftBound
            ? parserState.error(
                  buildUnpairedMessage(
                      s.root.toString(),
                      s.branches.leftBound[0].toString(),
                      s.branches.leftBound[1]
                  )
              )
            : s

    export type assertClosed<s extends ParserState.WithRoot> =
        s["branches"]["leftBound"] extends ParserState.OpenLeftBound
            ? ParserState.error<
                  buildUnpairedMessage<
                      Ast.ToString<ParserState.mergeIntersectionAndUnion<s>>,
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

    type buildUnpairedMessage<
        root extends string,
        limit extends string,
        token extends Bound.Token
    > = `Left bounds are only valid when paired with right bounds. Consider using ${root}${Bound.InvertedComparators[token]}${limit} instead.`
}
