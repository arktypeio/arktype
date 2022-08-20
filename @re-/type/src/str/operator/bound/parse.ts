// TODO: Remove
/* eslint-disable max-lines */
import {
    Keyword,
    literalToNumber,
    NumberLiteralDefinition,
    NumberLiteralNode
} from "../../base/index.js"
import { Node } from "../../common.js"
import {
    Expression,
    ExpressionWithRoot,
    Main,
    Scanner,
    State,
    Suffix,
    Tree,
    UntilCondition
} from "../../parser/index.js"
import {
    boundChars,
    boundTokens,
    inTokenSet,
    SuffixToken,
    tokenSet
} from "../../parser/tokens.js"
import { DoubleBoundDefinition, DoubleBoundNode } from "./double.js"
import { BoundableNode, isBoundable } from "./shared.js"
import { SingleBoundNode } from "./single.js"

export namespace Bound {
    export type Bounds = {
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

    export const parse = (s: State<ExpressionWithRoot>, start: Bound.Char) => {
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
    > = Unscanned extends Scanner.Shift<"=", infer Rest>
        ? State.From<Reduce<S["L"], `${Start}=`>, Rest>
        : Start extends SingleCharComparator
        ? State.From<Reduce<S["L"], Start>, Unscanned>
        : State.Error<SingleEqualsMessage>

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

    export const reduce = (s: State<ExpressionWithRoot>, token: Token) =>
        s.hasRoot(NumberLiteralNode)
            ? reduceLeft(s, token)
            : Main.transitionToSuffix(s, token)

    export type Reduce<
        L extends Expression.T,
        Comparator extends Token
    > = L extends Expression.WithRoot<
        NumberLiteralDefinition<infer BoundingValue>
    >
        ? ReduceLeft<L, Comparator, BoundingValue>
        : Main.TransitionToSuffix<L, Comparator>

    const applyLeftBound = (
        s: State<ExpressionWithRoot<NumberLiteralNode>>,
        token: DoubleBoundToken
    ) => {
        s.l.bounds.left = [s.l.root.value, token]
        s.l.root = undefined as any
        return s
    }

    const reduceLeft = (
        s: State<ExpressionWithRoot<NumberLiteralNode>>,
        token: Bound.Token
    ) =>
        s.isPrefixable()
            ? inTokenSet(token, doubleBoundTokens)
                ? applyLeftBound(s, token)
                : s.error(invalidDoubleBoundMessage(token))
            : s.error(nonPrefixLeftBoundMessage(s.l.root.value, token))

    type ReduceLeft<
        L extends Expression.T,
        T extends Token,
        BoundingValue extends number
    > = Expression.IsPrefixable<L> extends true
        ? T extends DoubleBoundToken
            ? Expression.From<{
                  groups: []
                  branches: {}
                  root: undefined
                  bounds: { left: [BoundingValue, T] }
              }>
            : Expression.Error<InvalidDoubleBoundMessage<T>>
        : Expression.Error<NonPrefixLeftBoundMessage<BoundingValue, T>>

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

    const untilNextSuffix: UntilCondition = (scanner) =>
        scanner.lookahead === "?"

    export const parseRight = (
        s: State<Suffix>,
        token: Token,
        ctx: Node.Context
    ) => {
        const boundingValue = s.r.shiftUntil(untilNextSuffix)
        const nextSuffix = s.r.shift() as "?" | "END"
        return NumberLiteralNode.matches(boundingValue)
            ? reduceRight(
                  s,
                  [token, literalToNumber(boundingValue)],
                  nextSuffix,
                  ctx
              )
            : s.error(rightBoundSuffixMessage(token, boundingValue))
    }

    export type ParseRight<
        S extends State.Of<Expression.Suffix>,
        T extends Token
    > = S["R"] extends BoundingValueWithSuffix<
        infer Value,
        infer NextSuffix,
        infer Unscanned
    >
        ? State.From<ReduceRight<S["L"], [T, Value], NextSuffix>, Unscanned>
        : S["R"] extends NumberLiteralDefinition<infer BoundingValue>
        ? State.From<ReduceRight<S["L"], [T, BoundingValue], "END">, "">
        : State.Error<RightBoundSuffixMessage<T, S["R"]>>

    type BoundingValueWithSuffix<
        BoundingValue extends number,
        NextSuffix extends "?",
        Unscanned extends string
    > = `${BoundingValue}${NextSuffix}${Unscanned}`

    export const reduceRight = (
        s: State<Suffix>,
        right: Right,
        nextSuffix: SuffixToken,
        ctx: Node.Context
    ) =>
        hasBoundableRoot(s)
            ? hasLeftBound(s)
                ? reduceDouble(s, right, nextSuffix, ctx)
                : reduceSingle(s, right, nextSuffix, ctx)
            : s.error(unboundableMessage(s.l.root.toString()))

    export type ReduceRight<
        L extends Expression.Suffix,
        R extends Right,
        NextSuffix extends SuffixToken
    > = HasBoundableRoot<L> extends true
        ? HasLeftBound<L> extends true
            ? ReduceDouble<L, R, NextSuffix>
            : ReduceSingle<L, R, NextSuffix>
        : Expression.Error<UnboundableMessage<Tree.ToString<L["root"]>>>

    type HasBoundableRoot<L extends Expression.Suffix> =
        L["root"] extends BoundableT ? true : false

    const hasBoundableRoot = (
        s: State<Suffix>
    ): s is State<Suffix & { root: BoundableNode }> => isBoundable(s.l.root)

    type HasLeftBound<L extends Expression.Suffix> = "left" extends keyof L
        ? true
        : false

    const hasLeftBound = (
        s: State<Suffix>
    ): s is State<Suffix & { bounds: Required<Bounds> }> => "left" in s.l.bounds

    type ReduceDouble<
        L extends Expression.Suffix,
        R extends Right,
        NextSuffix extends SuffixToken
    > = IsValidDoubleBound<R[0]> extends true
        ? Expression.SuffixFrom<{
              bounds: {
                  left: L["bounds"]["left"]
                  right: R
              }
              root: L["root"]
              nextSuffix: NextSuffix
          }>
        : Expression.Error<InvalidDoubleBoundMessage<R[0]>>

    const reduceDouble = (
        s: State<Suffix & { root: BoundableNode; bounds: Required<Bounds> }>,
        right: Right,
        nextSuffix: SuffixToken,
        ctx: Node.Context
    ) => {
        s.l.bounds.right = right
        s.l.nextSuffix = nextSuffix
        if (isValidDoubleBound(s.l.bounds)) {
            s.l.root = new DoubleBoundNode(s.l.root, s.l.bounds, ctx) as any
            return s
        }
        return s.error(invalidDoubleBoundMessage(right[0]))
    }

    type ReduceSingle<
        L extends Expression.Suffix,
        R extends Right,
        NextSuffix extends SuffixToken
    > = Expression.SuffixFrom<{
        bounds: {
            right: R
        }
        root: L["root"]
        nextSuffix: NextSuffix
    }>

    //TODO: Try out types to stop casting to any?
    const reduceSingle = (
        s: State<Suffix & { root: BoundableNode }>,
        right: Right,
        nextSuffix: SuffixToken,
        ctx: Node.Context
    ) => {
        s.l.bounds.right = right
        s.l.nextSuffix = nextSuffix
        s.l.root = new SingleBoundNode(s.l.root, right, ctx) as any
        return s
    }

    const isValidDoubleBound = (
        bounds: Required<Bounds>
    ): bounds is DoubleBoundDefinition =>
        inTokenSet(bounds.right[0], doubleBoundTokens)

    type IsValidDoubleBound<RightToken extends Token> =
        RightToken extends DoubleBoundToken ? true : false

    export const isUnpairedLeftBound = (bounds: Bounds) =>
        "left" in bounds && !("right" in bounds)

    export type IsUnpairedLeftBound<B extends Bounds> = "left" extends keyof B
        ? "right" extends keyof B
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
