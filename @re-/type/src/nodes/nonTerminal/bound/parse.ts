// TODO: Remove
/* eslint-disable max-lines */
import { Base } from "../../base/index.js"
import {
    boundChars,
    boundTokens,
    Core,
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
    literalToNumber,
    NumberLiteralDefinition,
    NumberLiteralNode
} from "../../terminal/index.js"
import { DoubleBoundDefinition, DoubleBoundNode } from "./double.js"
import { isBoundable } from "./shared.js"
import { SingleBoundNode } from "./single.js"

export namespace Bound {
    export type State = {
        left?: Bound.Left
        right?: Bound.Right
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

    const singleCharBoundTokens = tokenSet({
        "<": 1,
        ">": 1
    })

    export type SingleCharComparator = keyof typeof singleCharBoundTokens

    export type Left = [number, DoubleBoundToken]

    export type Right = [Token, number]

    /** A BoundableNode must be either:
     *    1. A number-typed keyword terminal (e.g. "integer" in "integer>5")
     *    2. A string-typed keyword terminal (e.g. "alphanum" in "100<alphanum")
     *    3. Any list node (e.g. "(string|number)[]" in "(string|number)[]>0")
     */
    export type BoundableT =
        | Keyword.OfTypeNumber
        | Keyword.OfTypeString
        | [unknown, "[]"]

    export const parse = (s: State.WithRoot, start: Bound.Char) => {
        if (s.r.lookahead === "=") {
            s.r.shift()
            reduce(s, `${start}${s.r.lookahead}`)
        } else if (inTokenSet(start, singleCharBoundTokens)) {
            reduce(s, start)
        } else {
            throw new Error(singleEqualsMessage)
        }
        return s
    }

    export type Parse<
        S extends State.T,
        Start extends Bound.Char,
        Unscanned extends string
    > = Unscanned extends Scan<"=", infer Rest>
        ? State.From<{ L: Reduce<S["L"], `${Start}=`>; R: Rest }>
        : Start extends SingleCharComparator
        ? State.From<{ L: Reduce<S["L"], Start>; R: Unscanned }>
        : State.ErrorFrom<SingleEqualsMessage>

    const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality.`
    type SingleEqualsMessage = typeof singleEqualsMessage

    type InvalidDoubleBoundMessage<T extends Token> =
        `Double-bound expressions must specify their bounds using < or <= (got ${T}).`

    const invalidDoubleBoundMessage = <T extends Token>(
        T: T
    ): InvalidDoubleBoundMessage<T> =>
        `Double-bound expressions must specify their bounds using < or <= (got ${T}).`

    type NonPrefixLeftBoundMessage<
        BoundingValue extends number,
        T extends Token
    > = `Left bound '${BoundingValue}${T}...' must occur at the beginning of the definition.`

    const nonPrefixLeftBoundMessage = <
        BoundingValue extends number,
        T extends Token
    >(
        Value: BoundingValue,
        T: T
    ): NonPrefixLeftBoundMessage<BoundingValue, T> =>
        `Left bound '${Value}${T}...' must occur at the beginning of the definition.`

    export const reduce = (s: State.WithRoot, token: Token) =>
        State.rootIs(s, NumberLiteralNode)
            ? reduceLeft(s, token)
            : Core.transitionToSuffix(s, token)

    export type Reduce<
        L extends Left.T,
        Comparator extends Token
    > = L extends Left.RootOf<NumberLiteralDefinition<infer BoundingValue>>
        ? ReduceLeft<L, Comparator, BoundingValue>
        : Core.TransitionToSuffix<L, Comparator>

    const applyLeftBound = (
        s: State.WithRoot<NumberLiteralNode>,
        token: DoubleBoundToken
    ) => {
        s.l.bounds.left = [s.l.root.value, token]
        s.l.root = undefined as any
        return s as State.WithRoot<undefined>
    }

    const reduceLeft = (
        s: State.WithRoot<NumberLiteralNode>,
        token: Bound.Token
    ) =>
        Left.isPrefixable(s.l)
            ? inTokenSet(token, doubleBoundTokens)
                ? applyLeftBound(s, token)
                : State.errorFrom(invalidDoubleBoundMessage(token))
            : State.errorFrom(nonPrefixLeftBoundMessage(s.l.root.value, token))

    type ReduceLeft<
        L extends Left.T,
        T extends Token,
        BoundingValue extends number
    > = Left.IsPrefixable<L> extends true
        ? T extends DoubleBoundToken
            ? Left.From<{
                  groups: []
                  branches: {}
                  root: undefined
                  bounds: { left: [BoundingValue, T] }
              }>
            : Left.ErrorFrom<InvalidDoubleBoundMessage<T>>
        : Left.ErrorFrom<NonPrefixLeftBoundMessage<BoundingValue, T>>

    export type RightBoundSuffixMessage<
        T extends Token,
        Suffix extends string
    > = `Right bound ${T} must be followed by a number literal and zero or more additional suffix tokens (got '${Suffix}').`

    export const rightBoundSuffixMessage = <
        T extends Token,
        Suffix extends string
    >(
        t: T,
        suffix: Suffix
    ): RightBoundSuffixMessage<T, Suffix> =>
        `Right bound ${t} must be followed by a number literal and zero or more additional suffix tokens (got '${suffix}').`

    const untilNextSuffix: State.UntilCondition = (scanner) =>
        scanner.lookahead === "?"

    export const parseRight = (
        s: State.ValidatedSuffixV,
        token: Token,
        ctx: Base.Parsing.Context
    ) => {
        const boundingValue = s.r.shiftUntil(untilNextSuffix)
        const nextSuffix = s.r.shift() as "?" | "END"
        return NumberLiteralNode.matches(boundingValue)
            ? reduceRight(
                  s,
                  token,
                  literalToNumber(boundingValue),
                  nextSuffix,
                  ctx
              )
            : State.errorFrom(rightBoundSuffixMessage(token, boundingValue))
    }

    export type ParseRight<
        S extends State.Suffix,
        T extends Token
    > = S["R"] extends BoundingValueWithSuffix<
        infer Value,
        infer NextSuffix,
        infer Unscanned
    >
        ? State.SuffixFrom<{
              L: ReduceRight<S, T, Value, NextSuffix>
              R: Unscanned
          }>
        : S["R"] extends NumberLiteralDefinition<infer BoundingValue>
        ? State.SuffixFrom<{
              L: ReduceRight<S, T, BoundingValue, "END">
              R: ""
          }>
        : State.ErrorFrom<RightBoundSuffixMessage<T, S["R"]>>

    type BoundingValueWithSuffix<
        BoundingValue extends number,
        NextSuffix extends "?",
        Unscanned extends string
    > = `${BoundingValue}${NextSuffix}${Unscanned}`

    export const reduceRight = (
        s: State.ValidatedSuffixV,
        token: Token,
        boundingValue: number,
        nextSuffix: SuffixToken,
        ctx: Base.Parsing.Context
    ) => {
        if (isBoundable(s.l.root)) {
            s.l.bounds.right = [token, boundingValue]
            s.l.nextSuffix = nextSuffix
            if (hasLeftBound(s.l.bounds)) {
                if (isValidDoubleBound(s.l.bounds)) {
                    s.l.root = new DoubleBoundNode(s.l.root, s.l.bounds, ctx)
                    return s
                }
                return State.errorFrom(invalidDoubleBoundMessage(token))
            }
            s.l.root = new SingleBoundNode(s.l.root, s.l.bounds.right, ctx)
            return s
        }
        return State.errorFrom(unboundableMessage(s.l.root.toString()))
    }

    const hasLeftBound = (bounds: State): bounds is Required<State> =>
        !!bounds.left

    export type ReduceRight<
        S extends State.Suffix,
        T extends Token,
        Value extends number,
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
            : Left.ErrorFrom<InvalidDoubleBoundMessage<T>>
        : Left.ErrorFrom<UnboundableMessage<Tree.ToString<S["L"]["root"]>>>

    const isValidDoubleBound = (
        bounds: Required<State>
    ): bounds is DoubleBoundDefinition =>
        inTokenSet(bounds.right[0], doubleBoundTokens)

    type RightTokenIsValid<
        Bounds extends Bound.State,
        T extends Token
    > = "left" extends keyof Bounds
        ? T extends DoubleBoundToken
            ? true
            : false
        : true

    export const isUnpairedLeftBound = (bounds: State) =>
        "left" in bounds && !("right" in bounds)

    export type IsUnpairedLeftBound<Bounds extends State> =
        "left" extends keyof Bounds
            ? "right" extends keyof Bounds
                ? false
                : true
            : false

    export const unpairedLeftBoundMessage = `Left bounds are only valid when paired with right bounds.`
    export type UnpairedLeftBoundMessage = typeof unpairedLeftBoundMessage

    type UnboundableMessage<Root extends string> =
        `Bounded expression '${Root}' must be a number-or-string-typed keyword or a list-typed expression.`
    const unboundableMessage = <Root extends string>(
        Root: Root
    ): UnboundableMessage<Root> =>
        `Bounded expression '${Root}' must be a number-or-string-typed keyword or a list-typed expression.`
}
