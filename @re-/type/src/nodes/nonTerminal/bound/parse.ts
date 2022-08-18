// TODO: Remove
/* eslint-disable max-lines */
import { isEmpty, toNumber } from "@re-/tools"
import { Base } from "../../base/index.js"
import {
    boundChars,
    boundTokens,
    Core,
    ErrorToken,
    inTokenSet,
    Left,
    Scan,
    State,
    SuffixToken,
    tokenSet,
    Tree
} from "../../parser/index.js"
import {
    Keyword,
    NumberLiteralDefinition,
    NumberLiteralNode
} from "../../terminal/index.js"
import { DoubleBoundDefinition, DoubleBoundNode } from "./double.js"
import { BoundableV, isBoundable } from "./shared.js"
import { SingleBoundDefinition, SingleBoundNode } from "./single.js"

export namespace Bound {
    export type T = {
        left?: Bound.Left
        right?: Bound.Right
    }

    export type V = {
        left?: Bound.Left
        bounded?: BoundableV
        rightToken?: Bound.Token
    }

    export const tokens = boundTokens

    export const chars = boundChars

    export type Token = keyof typeof tokens

    export type Char = keyof typeof chars

    export type DoubleBoundToken = keyof typeof doubleBoundTokens

    export const doubleBoundTokens = tokenSet({
        "<": 1,
        "<=": 1
    })

    type TwoCharComparator = "<=" | "==" | ">="

    const singleCharBoundTokens = tokenSet({
        "<": 1,
        ">": 1
    })

    export type SingleCharComparator = keyof typeof singleCharBoundTokens

    export type Left = [NumberLiteralDefinition, DoubleBoundToken]

    export type Right = [Token, NumberLiteralDefinition]

    /** A BoundableNode must be either:
     *    1. A number-typed keyword terminal (e.g. "integer" in "integer>5")
     *    2. A string-typed keyword terminal (e.g. "alphanum" in "100<alphanum")
     *    3. Any list node (e.g. "(string|number)[]" in "(string|number)[]>0")
     */
    export type BoundableT =
        | Keyword.OfTypeNumber
        | Keyword.OfTypeString
        | [unknown, "[]"]

    export const shiftReduce = (s: State.WithRoot, start: Bound.Char) => {
        if (s.r.lookahead === "=") {
            s.r.shift()
            reduce(s, `${start}${s.r.lookahead}`)
        } else if (inTokenSet(start, singleCharBoundTokens)) {
            reduce(s, start)
        } else {
            throw new Error(singleEqualsMessage)
        }
    }

    export type ShiftReduce<
        S extends State.T,
        Start extends Bound.Char,
        Unscanned extends string
    > = Unscanned extends Scan<"=", infer Rest>
        ? State.From<{ L: Reduce<S["L"], `${Start}=`>; R: Rest }>
        : Start extends SingleCharComparator
        ? State.From<{ L: Reduce<S["L"], Start>; R: Unscanned }>
        : State.Error<SingleEqualsMessage>

    const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality.`
    type SingleEqualsMessage = typeof singleEqualsMessage

    type InvalidDoubleBoundMessage<T extends Token> =
        `Double-bound expressions must specify their bounds using < or <= (got ${T}).`

    const invalidDoubleBoundMessage = <T extends Token>(
        T: T
    ): InvalidDoubleBoundMessage<T> =>
        `Double-bound expressions must specify their bounds using < or <= (got ${T}).`

    type NonNumericBoundMessage<Value extends string> =
        `Bounding values must be specified using a number literal (got '${Value}').`

    const nonNumericBoundingMessage = <Value extends string>(
        Value: Value
    ): NonNumericBoundMessage<Value> =>
        `Bounding values must be specified using a number literal (got '${Value}').`

    type NonPrefixLeftBoundMessage<
        Value extends NumberLiteralDefinition,
        T extends Token
    > = `Left bound '${Value}${T}...' must occur at the beginning of the definition.`

    const nonPrefixLeftBoundMessage = <
        Value extends NumberLiteralDefinition,
        T extends Token
    >(
        Value: Value,
        T: T
    ): NonPrefixLeftBoundMessage<Value, T> =>
        `Left bound '${Value}${T}...' must occur at the beginning of the definition.`

    export const reduce = (s: State.WithRoot, token: Token) =>
        State.rootIs(s, NumberLiteralNode)
            ? reduceLeft(s, token)
            : reduceRight(s, token)

    export type Reduce<
        L extends Left.T,
        Comparator extends Token
    > = L extends Left.RootOf<NumberLiteralDefinition>
        ? ReduceLeft<L, Comparator>
        : Core.TransitionToSuffix<L, Comparator>

    const reduceLeft = (
        s: State.WithRoot<NumberLiteralNode>,
        token: Bound.Token
    ) => {
        if (!Left.isPrefixable(s.l)) {
            throw new Error(nonPrefixLeftBoundMessage(s.l.root.def, token))
        }
        if (inTokenSet(token, doubleBoundTokens)) {
            s.l.bounds.left = [s.l.root.def, token]
        } else {
            throw new Error(invalidDoubleBoundMessage(token))
        }
    }

    type ReduceLeft<
        L extends Left.WithRoot<NumberLiteralDefinition>,
        T extends Token
    > = Left.IsPrefixable<L> extends true
        ? T extends DoubleBoundToken
            ? Left.From<{
                  groups: []
                  branches: {}
                  root: undefined
                  bounds: { left: [L["root"], T] }
              }>
            : Left.Error<InvalidDoubleBoundMessage<T>>
        : Left.Error<NonPrefixLeftBoundMessage<L["root"], T>>

    const reduceRight = (s: State.WithRoot, token: Token) => {
        if (s.l.bounds.rightToken) {
            throw new Error(multipleRightBoundsMessage)
        }
        if (!isBoundable(s.l.root)) {
            throw new Error(unboundableMessage(s.l.root.toString()))
        }
        s.l.bounds.bounded = s.l.root
        s.l.bounds.rightToken = token
        s.l.root = undefined as any
    }

    type ValueWithSuffix<
        Value extends NumberLiteralDefinition,
        NextSuffix extends "?",
        Unscanned extends string
    > = `${Value}${NextSuffix}${Unscanned}`

    export type ParseRight<
        S extends State.Suffix,
        T extends Token
    > = S["R"] extends ValueWithSuffix<
        infer Value,
        infer NextSuffix,
        infer Unscanned
    >
        ? State.SuffixFrom<{
              L: ReduceRight<S, T, Value, NextSuffix>
              R: Unscanned
          }>
        : S["R"] extends NumberLiteralDefinition
        ? State.SuffixFrom<{
              L: ReduceRight<S, T, S["R"], "">
              R: ""
          }>
        : State.Error<`Right bound ${T} must be followed by a number literal and zero or more additional suffix tokens (got ${S["R"]}).`>

    export type ReduceRight<
        S extends State.Suffix,
        T extends Token,
        Value extends NumberLiteralDefinition,
        NextSuffix extends Left.SuffixToken
    > = S["L"]["root"] extends BoundableT
        ? RightTokenIsValid<S["L"]["bounds"], T> extends true
            ? Left.SuffixFrom<{
                  bounds: {
                      left: S["L"]["bounds"]["left"]
                      right: [T, Value]
                  }
                  root: S["L"]["root"]
                  nextSuffix: NextSuffix
              }>
            : Left.Error<InvalidDoubleBoundMessage<T>>
        : Left.Error<UnboundableMessage<Tree.ToString<S["L"]["root"]>>>

    const multipleRightBoundsMessage = `Definitions may have at most one right bound.`
    type MultipleRightBoundsMessage = typeof multipleRightBoundsMessage

    type RightTokenIsValid<
        Bounds extends Bound.T,
        T extends Token
    > = "left" extends keyof Bounds
        ? T extends DoubleBoundToken
            ? true
            : false
        : true

    export const finalize = (s: State.V) => {
        if (isEmpty(s.l.bounds)) {
            return
        }
        if (isUnpairedLeftBound(s.l.bounds)) {
            throw new Error(unpairedLeftBoundMessage)
        }
        if (s.l.root instanceof NumberLiteralNode) {
            s.l.root = s.l.bounds.bounded
        }
    }
    const isUnpairedLeftBound = (bounds: V) =>
        !!bounds.left && !bounds.rightToken

    type IsUnpairedLeftBound<Bounds extends T> = "left" extends keyof Bounds
        ? "rightToken" extends keyof Bounds
            ? false
            : true
        : false

    const unpairedLeftBoundMessage = `Left bounds are only valid when paired with right bounds.`
    type UnpairedLeftBoundMessage = typeof unpairedLeftBoundMessage

    type UnboundableMessage<Root extends string> =
        `Bounded expression '${Root}' must be a number-or-string-typed keyword or a list-typed expression.`
    const unboundableMessage = <Root extends string>(
        Root: Root
    ): UnboundableMessage<Root> =>
        `Bounded expression '${Root}' must be a number-or-string-typed keyword or a list-typed expression.`

    // const createBound = (
    //     s: State.WithRoot,
    //     right: Right,
    //     ctx: Base.Parsing.Context
    // ) => {
    //     s.bounds.right = right
    //     if (!isBoundable(s.root)) {
    //         throw new Error(unboundableMessage(s.root.toString()))
    //     }
    //     if (isDoubleBoundCandidate(s.bounds)) {
    //         return new DoubleBoundNode(
    //             s.root,
    //             validateDoubleBound(s.bounds),
    //             ctx
    //         )
    //     } else {
    //         return new SingleBoundNode(
    //             s.root,
    //             validateSingleBound(s.bounds.right),
    //             ctx
    //         )
    //     }
    // }
}
