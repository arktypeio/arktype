// TODO: Remove
/* eslint-disable max-lines */
import { Keyword } from "../../operand/unenclosed/keyword/keyword.js"
import {
    literalToNumber,
    NumberLiteralDefinition,
    NumberLiteralNode
} from "../../operand/unenclosed/numberLiteral.js"
import { BoundableNode, isBoundable, Node, Operator, Parser } from "./common.js"
import { DoubleBoundDefinition, DoubleBoundNode } from "./double.js"
import { SingleBoundNode } from "./single.js"

export type Bounds = {
    left?: LeftDefinition
    right?: RightDefinition
}

export const tokens = Parser.Tokens.boundTokens

export const chars = Parser.Tokens.boundChars

export type Comparator = keyof typeof tokens

export type ComparatorChar = keyof typeof chars

export type DoubleBoundComparator = keyof typeof doubleBoundTokens

export const doubleBoundTokens = Parser.Tokens.tokenSet({
    "<": 1,
    "<=": 1
})

const singleCharBoundTokens = Parser.Tokens.tokenSet({
    "<": 1,
    ">": 1
})

export type SingleCharComparator = keyof typeof singleCharBoundTokens

export type LeftDefinition = [number, DoubleBoundComparator]

export type RightDefinition = [Comparator, number]

/** A BoundableNode must be either:
 *    1. A number-typed keyword terminal (e.g. "integer" in "integer>5")
 *    2. A string-typed keyword terminal (e.g. "alphanum" in "100<alphanum")
 *    3. Any list node (e.g. "(string|number)[]" in "(string|number)[]>0")
 */
export type BoundableT =
    | Keyword.OfTypeNumber
    | Keyword.OfTypeString
    | [unknown, "[]"]

export const parse = (s: Operator.state, start: ComparatorChar) => {
    if (s.r.lookahead === "=") {
        s.r.shift()
        reduce(s, `${start}${s.r.lookahead}`)
    } else if (Parser.Tokens.inTokenSet(start, singleCharBoundTokens)) {
        reduce(s, start)
    } else {
        throw new Error(singleEqualsMessage)
    }
    return s
}

export type Parse<
    S extends Parser.State,
    Start extends ComparatorChar,
    Unscanned extends string
> = Unscanned extends Parser.Scanner.Shift<"=", infer Rest>
    ? Parser.State.From<{ L: Reduce<S["L"], `${Start}=`>; R: Rest }>
    : Start extends SingleCharComparator
    ? Parser.State.From<{ L: Reduce<S["L"], Start>; R: Unscanned }>
    : Parser.State.Error<SingleEqualsMessage>

const singleEqualsMessage = `= is not a valid comparator. Use == to check for equality.`
type SingleEqualsMessage = typeof singleEqualsMessage

type InvalidDoubleBoundMessage<T extends Comparator> =
    `Double-bound expressions must specify their bounds using < or <= (got ${T}).`

const invalidDoubleBoundMessage = <T extends Comparator>(
    T: T
): InvalidDoubleBoundMessage<T> =>
    `Double-bound expressions must specify their bounds using < or <= (got ${T}).`

type NonPrefixLeftBoundMessage<
    BoundingValue extends number,
    T extends Comparator
> = `Left bound '${BoundingValue}${T}...' must occur at the beginning of the definition.`

const nonPrefixLeftBoundMessage = <
    BoundingValue extends number,
    T extends Comparator
>(
    Value: BoundingValue,
    T: T
): NonPrefixLeftBoundMessage<BoundingValue, T> =>
    `Left bound '${Value}${T}...' must occur at the beginning of the definition.`

export const reduce = (s: Operator.state, token: Comparator) =>
    s.hasRoot(NumberLiteralNode) ? reduceLeft(s, token) : s.suffixed(token)

export type Reduce<
    L extends Parser.Left,
    Token extends Comparator
> = L extends Parser.Left.WithRoot<NumberLiteralDefinition<infer BoundingValue>>
    ? ReduceLeft<L, Token, BoundingValue>
    : Parser.Left.SetNextSuffix<L, Token>

const applyLeftBound = (
    s: Parser.state<Parser.left.withRoot<NumberLiteralNode>>,
    token: DoubleBoundComparator
) => {
    s.l.bounds.left = [s.l.root.value, token]
    s.l.root = undefined as any
    return s
}

const reduceLeft = (
    s: Parser.state<Parser.left.withRoot<NumberLiteralNode>>,
    token: Comparator
) =>
    s.isPrefixable()
        ? Parser.Tokens.inTokenSet(token, doubleBoundTokens)
            ? applyLeftBound(s, token)
            : Parser.state.error(invalidDoubleBoundMessage(token))
        : Parser.state.error(nonPrefixLeftBoundMessage(s.l.root.value, token))

type ReduceLeft<
    L extends Parser.Left,
    T extends Comparator,
    BoundingValue extends number
> = Parser.Left.IsPrefixable<L> extends true
    ? T extends DoubleBoundComparator
        ? Parser.Left.From<{
              groups: []
              branches: {}
              root: undefined
              bounds: { left: [BoundingValue, T] }
          }>
        : Parser.Left.Error<InvalidDoubleBoundMessage<T>>
    : Parser.Left.Error<NonPrefixLeftBoundMessage<BoundingValue, T>>

export type RightBoundSuffixMessage<
    T extends Comparator,
    Suffix extends string
> = `Right bound ${T} must be followed by a number literal and zero or more additional suffix tokens (got '${Suffix}').`

export const rightBoundSuffixMessage = <
    T extends Comparator,
    Suffix extends string
>(
    t: T,
    suffix: Suffix
): RightBoundSuffixMessage<T, Suffix> =>
    `Right bound ${t} must be followed by a number literal and zero or more additional suffix tokens (got '${suffix}').`

const untilNextSuffix: Parser.scanner.UntilCondition = (scanner) =>
    scanner.lookahead === "?"

export const parseRight = (
    s: Parser.state<Parser.left.suffix>,
    token: Comparator,
    ctx: Node.context
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
        : Parser.state.error(rightBoundSuffixMessage(token, boundingValue))
}

export type ParseRight<
    S extends Parser.State.Of<Parser.Left.Suffix>,
    T extends Comparator
> = S["R"] extends BoundingValueWithSuffix<
    infer Value,
    infer NextSuffix,
    infer Unscanned
>
    ? Parser.State.From<{
          L: ReduceRight<S["L"], [T, Value], NextSuffix>
          R: Unscanned
      }>
    : S["R"] extends NumberLiteralDefinition<infer BoundingValue>
    ? Parser.State.From<{
          L: ReduceRight<S["L"], [T, BoundingValue], "END">
          R: ""
      }>
    : Parser.State.Error<RightBoundSuffixMessage<T, S["R"]>>

type BoundingValueWithSuffix<
    BoundingValue extends number,
    NextSuffix extends "?",
    Unscanned extends string
> = `${BoundingValue}${NextSuffix}${Unscanned}`

export const reduceRight = (
    s: Parser.state<Parser.left.suffix>,
    right: RightDefinition,
    nextSuffix: Parser.Tokens.SuffixToken,
    ctx: Node.context
) =>
    hasBoundableRoot(s)
        ? hasLeftBound(s)
            ? reduceDouble(s, right, nextSuffix, ctx)
            : reduceSingle(s, right, nextSuffix, ctx)
        : Parser.state.error(unboundableMessage(s.l.root.toString()))

export type ReduceRight<
    L extends Parser.Left.Suffix,
    R extends RightDefinition,
    NextSuffix extends Parser.Tokens.SuffixToken
> = HasBoundableRoot<L> extends true
    ? HasLeftBound<L> extends true
        ? ReduceDouble<L, R, NextSuffix>
        : ReduceSingle<L, R, NextSuffix>
    : Parser.Left.Error<UnboundableMessage<Tree.ToString<L["root"]>>>

type HasBoundableRoot<L extends Parser.Left.Suffix> =
    L["root"] extends BoundableT ? true : false

const hasBoundableRoot = (
    s: Parser.state<Parser.left.suffix>
): s is Parser.state<Parser.left.suffix<{ root: BoundableNode }>> =>
    isBoundable(s.l.root)

type HasLeftBound<L extends Parser.Left.Suffix> = "left" extends keyof L
    ? true
    : false

const hasLeftBound = (
    s: Parser.state.suffix
): s is Parser.state.suffix<{ bounds: Required<Bounds> }> =>
    "left" in s.l.bounds

type ReduceDouble<
    L extends Parser.Left.Suffix,
    R extends RightDefinition,
    NextSuffix extends Parser.Tokens.SuffixToken
> = IsValidDoubleBound<R[0]> extends true
    ? Parser.Left.SuffixFrom<{
          bounds: {}
          root: [...L["bounds"]["left"], L["root"], ...R]
          nextSuffix: NextSuffix
      }>
    : Parser.Left.Error<InvalidDoubleBoundMessage<R[0]>>

const reduceDouble = (
    s: Parser.state<
        Parser.left.suffix<{ root: BoundableNode; bounds: Required<Bounds> }>
    >,
    right: RightDefinition,
    nextSuffix: Parser.Tokens.SuffixToken,
    ctx: Node.context
) => {
    s.l.bounds.right = right
    s.l.nextSuffix = nextSuffix
    if (isValidDoubleBound(s.l.bounds)) {
        s.l.root = new DoubleBoundNode(s.l.root, s.l.bounds, ctx) as any
        return s
    }
    return Parser.state.error(invalidDoubleBoundMessage(right[0]))
}

type ReduceSingle<
    L extends Parser.Left.Suffix,
    R extends RightDefinition,
    NextSuffix extends Parser.Tokens.SuffixToken
> = Parser.Left.SuffixFrom<{
    bounds: {}
    root: [L["root"], ...R]
    nextSuffix: NextSuffix
}>

//TODO: Try out types to stop casting to any?
const reduceSingle = (
    s: Parser.state.suffix<{ root: BoundableNode }>,
    right: RightDefinition,
    nextSuffix: Parser.Tokens.SuffixToken,
    ctx: Node.context
) => {
    s.l.bounds.right = right
    s.l.nextSuffix = nextSuffix
    s.l.root = new SingleBoundNode(s.l.root, right, ctx) as any
    return s
}

const isValidDoubleBound = (
    bounds: Required<Bounds>
): bounds is DoubleBoundDefinition =>
    Parser.Tokens.inTokenSet(bounds.right[0], doubleBoundTokens)

type IsValidDoubleBound<RightToken extends Comparator> =
    RightToken extends DoubleBoundComparator ? true : false

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
