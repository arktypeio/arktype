import { isKeyOf } from "@re-/tools"
import { Bound } from "../../../../nodes/expression/bound.js"
import type { PrimitiveLiteral } from "../../../../nodes/terminal/primitiveLiteral.js"
import type { Ast } from "../../../../nodes/traverse/ast.js"
import type { Left } from "../../state/left.js"
import type { parserState } from "../../state/state.js"
import { Comparators } from "./tokens.js"

export namespace LeftBoundOperator {
    export const reduce = (
        s: parserState.requireRoot<PrimitiveLiteral.Node<number>>,
        comparator: Bound.Token
    ) =>
        isKeyOf(comparator, Bound.doubleTokens)
            ? reduceValidated(s, comparator)
            : s.error(Comparators.invalidDoubleMessage(comparator))

    export type Reduce<
        L extends Left.WithRoot<PrimitiveLiteral.Number>,
        Comparator extends Bound.Token
    > = Comparator extends Bound.DoubleToken
        ? ReduceValidated<L, Comparator>
        : Left.Error<Comparators.InvalidDoubleMessage<Comparator>>

    const reduceValidated = (
        s: parserState.requireRoot<PrimitiveLiteral.Node<number>>,
        token: Bound.DoubleToken
    ) => {
        s.l.branches.leftBound = [s.l.root, token]
        s.l.root = undefined as any
        return s
    }

    type ReduceValidated<
        L extends Left.WithRoot<PrimitiveLiteral.Number>,
        Comparator extends Bound.DoubleToken
    > = Left.From<{
        groups: L["groups"]
        branches: {
            union: L["branches"]["union"]
            intersection: L["branches"]["intersection"]
            leftBound: [L["root"], Comparator]
        }
        root: undefined
    }>

    export const assertClosed = (s: parserState.requireRoot) =>
        s.l.branches.leftBound
            ? s.error(
                  unpairedMessage(
                      s.l.root.toString(),
                      s.l.branches.leftBound[0].toString(),
                      s.l.branches.leftBound[1]
                  )
              )
            : s

    export type AssertClosed<L extends Left> =
        L["branches"]["leftBound"] extends Left.OpenBranches.LeftBound<
            infer Limit,
            infer Comparator
        >
            ? Left.Error<
                  UnpairedMessage<
                      Ast.ToString<Left.MergeIntersectionAndUnionToRoot<L>>,
                      Limit,
                      Comparator
                  >
              >
            : L

    export type UnpairedMessage<
        Root extends string,
        Limit extends string,
        Token extends Bound.Token
    > = `Left bounds are only valid when paired with right bounds. Consider using ${Root}${Bound.InvertedComparators[Token]}${Limit} instead.`

    export const unpairedMessage = <
        Root extends string,
        Limit extends string,
        Token extends Bound.Token
    >(
        root: Root,
        limit: Limit,
        comparator: Token
    ): UnpairedMessage<Root, Limit, Token> =>
        `Left bounds are only valid when paired with right bounds. Consider using ${root}${Bound.invertedComparators[comparator]}${limit} instead.`
}
