import { isKeyOf } from "@re-/tools"
import type { NodeToString } from "../../../../nodes/common.js"
import { Bound } from "../../../../nodes/nonTerminal/binary/bound.js"
import type { LiteralNode } from "../../../../nodes/terminal/literal.js"
import type { ParseError } from "../../../common.js"
import type { Left } from "../../state/left.js"
import type { parserState } from "../../state/state.js"
import { ComparatorTokens } from "./tokens.js"

export namespace LeftBoundOperator {
    export const reduce = (
        s: parserState.withPreconditionRoot<LiteralNode<number>>,
        comparator: Bound.Token
    ) =>
        isKeyOf(comparator, ComparatorTokens.doublable)
            ? reduceValidated(s, comparator)
            : s.error(ComparatorTokens.invalidDoubleMessage(comparator))

    export type Reduce<
        L extends Left,
        Limit extends number,
        Comparator extends Bound.Token
    > = Comparator extends ComparatorTokens.Doublable
        ? ReduceValidated<L, Limit, Comparator>
        : Left.Error<ComparatorTokens.InvalidDoubleMessage<Comparator>>

    const reduceValidated = (
        s: parserState.withPreconditionRoot<LiteralNode<number>>,
        token: ComparatorTokens.Doublable
    ) => {
        s.l.branches.leftBound = [s.l.root, token]
        s.l.root = undefined as any
        return s
    }

    type ReduceValidated<
        L extends Left,
        Limit extends number,
        Comparator extends ComparatorTokens.Doublable
    > = Left.From<{
        groups: L["groups"]
        branches: {
            union: L["branches"]["union"]
            intersection: L["branches"]["intersection"]
            leftBound: [Limit, Comparator]
        }
        root: undefined
    }>

    export const assertClosed = (s: parserState.withPreconditionRoot) =>
        s.l.branches.leftBound
            ? s.error(
                  unpairedLeftBoundMessage(
                      s.l.root.toString(),
                      s.l.branches.leftBound[0].value,
                      s.l.branches.leftBound[1]
                  )
              )
            : s

    export type AssertClosed<L extends Left> =
        L["branches"]["leftBound"] extends Left.OpenLeftBound<
            infer Limit,
            infer Comparator
        >
            ? ParseError<
                  UnpairedLeftBoundMessage<
                      NodeToString<L["root"]>,
                      Limit,
                      Comparator
                  >
              >
            : undefined

    export type UnpairedLeftBoundMessage<
        Root extends string,
        Limit extends number,
        Token extends Bound.Token
    > = `Left bounds are only valid when paired with right bounds. Consider using ${Root}${Bound.InvertedComparators[Token]}${Limit} instead.`

    export const unpairedLeftBoundMessage = <
        Root extends string,
        Limit extends number,
        Token extends Bound.Token
    >(
        root: Root,
        limit: Limit,
        comparator: Token
    ): UnpairedLeftBoundMessage<Root, Limit, Token> =>
        `Left bounds are only valid when paired with right bounds. Consider using ${root}${Bound.invertedComparators[comparator]}${limit} instead.`
}
