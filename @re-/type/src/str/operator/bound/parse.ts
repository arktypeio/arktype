// TODO: Remove
/* eslint-disable max-lines */
import {
    literalToNumber,
    NumberLiteralDefinition,
    numberLiteralNode
} from "../../operand/unenclosed/numberLiteral.js"
import {
    bound,
    boundableNode,
    BoundableNode,
    isBoundable,
    LowerBoundDefinition,
    SingleBoundDefinition,
    UpperBoundDefinition
} from "./bound.js"
import {
    Comparator,
    ComparatorChar,
    DoubleBoundComparator,
    doubleBoundComparators,
    Node,
    NodeToString,
    normalizeLowerBoundComparator,
    NormalizeLowerBoundComparator,
    Operator,
    Parser
} from "./common.js"

const singleCharComparator = Parser.tokenSet({
    "<": 1,
    ">": 1
})

export type SingleCharComparator = keyof typeof singleCharComparator

export const parse = (s: Operator.state, start: ComparatorChar) => {
    if (s.r.lookahead === "=") {
        s.r.shift()
        reduce(s, `${start}${s.r.lookahead}`)
    } else if (Parser.inTokenSet(start, singleCharComparator)) {
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

type InvalidDoubleBoundMessage<Token extends Comparator> =
    `Double-bound expressions must specify their bounds using < or <= (got ${Token}).`

const invalidDoubleBoundMessage = <Token extends Comparator>(
    T: Token
): InvalidDoubleBoundMessage<Token> =>
    `Double-bound expressions must specify their bounds using < or <= (got ${T}).`

type NonPrefixLeftBoundMessage<
    BoundingValue extends number,
    T extends Comparator
> = `Left bound '${BoundingValue}${T}...' must occur at the beginning of the definition.`

const nonPrefixLeftBoundMessage = <
    BoundingValue extends number,
    Token extends Comparator
>(
    Value: BoundingValue,
    T: Token
): NonPrefixLeftBoundMessage<BoundingValue, Token> =>
    `Left bound '${Value}${T}...' must occur at the beginning of the definition.`

export const reduce = (s: Operator.state, token: Comparator) =>
    s.hasRoot(numberLiteralNode) ? reduceLeft(s, token) : s.suffixed(token)

export type Reduce<
    L extends Parser.Left,
    Token extends Comparator
> = L extends { root: NumberLiteralDefinition<infer Value> }
    ? ReduceLeft<L, Value, Token>
    : Parser.Left.SetNextSuffix<L, Token>

const applyLeftBound = (
    s: Parser.state<Parser.left.withRoot<numberLiteralNode>>,
    token: DoubleBoundComparator
) => {
    s.l.lowerBound = [normalizeLowerBoundComparator(token), s.l.root.value]
    s.l.root = undefined as any
    return s
}

const reduceLeft = (
    s: Parser.state<Parser.left.withRoot<numberLiteralNode>>,
    token: Comparator
) =>
    s.isPrefixable()
        ? Parser.inTokenSet(token, doubleBoundComparators)
            ? applyLeftBound(s, token)
            : s.error(invalidDoubleBoundMessage(token))
        : s.error(nonPrefixLeftBoundMessage(s.l.root.value, token))

type ReduceLeft<
    L extends Parser.Left,
    Value extends number,
    Token extends Comparator
> = Parser.Left.IsPrefixable<L> extends true
    ? Token extends DoubleBoundComparator
        ? Parser.Left.From<{
              groups: []
              branches: {}
              root: undefined
              lowerBound: [NormalizeLowerBoundComparator<Token>, Value]
          }>
        : Parser.Left.Error<InvalidDoubleBoundMessage<Token>>
    : Parser.Left.Error<NonPrefixLeftBoundMessage<Value, Token>>

export type RightBoundSuffixMessage<
    T extends Comparator,
    Suffix extends string
> = `Right bound ${T} must be followed by a number literal and zero or more additional suffix tokens (got '${Suffix}').`

export const rightBoundSuffixMessage = <
    Token extends Comparator,
    Suffix extends string
>(
    t: Token,
    suffix: Suffix
): RightBoundSuffixMessage<Token, Suffix> =>
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
    return numberLiteralNode.matches(boundingValue)
        ? reduceRight(
              s,
              [token, literalToNumber(boundingValue)],
              nextSuffix,
              ctx
          )
        : s.error(rightBoundSuffixMessage(token, boundingValue))
}

export type ParseRight<
    S extends Parser.State.Of<Parser.Left.Suffix>,
    Token extends Comparator
> = S["R"] extends BoundingValueWithSuffix<
    infer Value,
    infer NextSuffix,
    infer Unscanned
>
    ? Parser.State.From<{
          L: ReduceRight<S["L"], [Token, Value], NextSuffix>
          R: Unscanned
      }>
    : S["R"] extends NumberLiteralDefinition<infer Value>
    ? Parser.State.From<{
          L: ReduceRight<S["L"], [Token, Value], "END">
          R: ""
      }>
    : Parser.State.Error<RightBoundSuffixMessage<Token, S["R"]>>

type BoundingValueWithSuffix<
    BoundingValue extends number,
    NextSuffix extends "?",
    Unscanned extends string
> = `${BoundingValue}${NextSuffix}${Unscanned}`

export const reduceRight = (
    s: Parser.state<Parser.left.suffix>,
    right: SingleBoundDefinition,
    nextSuffix: Parser.SuffixToken,
    ctx: Node.context
) =>
    hasBoundableRoot(s)
        ? hasLeftBound(s)
            ? reduceDouble(s, right, nextSuffix, ctx)
            : reduceSingle(s, right, nextSuffix, ctx)
        : s.error(unboundableMessage(s.l.root.toString()))

export type ReduceRight<
    L extends Parser.Left.Suffix,
    RightBound extends SingleBoundDefinition,
    NextSuffix extends Parser.SuffixToken
> = L extends { root: BoundableNode }
    ? L extends { lowerBound: LowerBoundDefinition }
        ? ReduceDouble<L, RightBound, NextSuffix>
        : ReduceSingle<L, RightBound, NextSuffix>
    : Parser.Left.Error<UnboundableMessage<NodeToString<L["root"]>>>

const hasBoundableRoot = (
    s: Parser.state<Parser.left.suffix>
): s is Parser.state<Parser.left.suffix<{ root: boundableNode }>> =>
    isBoundable(s.l.root)

const hasLeftBound = (
    s: Parser.state.suffix
): s is Parser.state.suffix<{ lowerBound: LowerBoundDefinition }> =>
    s.l.lowerBound !== undefined

type ReduceDouble<
    L extends Parser.Left.Suffix<{
        root: BoundableNode
        lowerBound: LowerBoundDefinition
    }>,
    RightBound extends SingleBoundDefinition,
    NextSuffix extends Parser.SuffixToken
> = RightBound extends UpperBoundDefinition
    ? Parser.Left.SuffixFrom<{
          lowerBound: undefined
          root: [L["root"], [L["lowerBound"], RightBound]]
          nextSuffix: NextSuffix
      }>
    : Parser.Left.Error<InvalidDoubleBoundMessage<RightBound[0]>>

const reduceDouble = (
    s: Parser.state<
        Parser.left.suffix<{
            root: boundableNode
            lowerBound: LowerBoundDefinition
        }>
    >,
    right: SingleBoundDefinition,
    nextSuffix: Parser.SuffixToken,
    ctx: Node.context
) => {
    s.l.nextSuffix = nextSuffix
    if (isValidDoubleBoundRight(right)) {
        s.l.root = new bound(s.l.root, [s.l.lowerBound, right], ctx) as any
        return s
    }
    return s.error(invalidDoubleBoundMessage(right[0]))
}

type ReduceSingle<
    L extends Parser.Left.Suffix,
    Bound extends SingleBoundDefinition,
    NextSuffix extends Parser.SuffixToken
> = Parser.Left.SuffixFrom<{
    lowerBound: undefined
    root: [L["root"], Bound]
    nextSuffix: NextSuffix
}>

//TODO: Try out types to stop casting to any?
const reduceSingle = (
    s: Parser.state.suffix<{ root: boundableNode }>,
    right: SingleBoundDefinition,
    nextSuffix: Parser.SuffixToken,
    ctx: Node.context
) => {
    s.l.nextSuffix = nextSuffix
    s.l.root = new bound(s.l.root, [right], ctx) as any
    return s
}

const isValidDoubleBoundRight = (
    right: SingleBoundDefinition
): right is LowerBoundDefinition =>
    Parser.inTokenSet(right[0], doubleBoundComparators)

export const unpairedLeftBoundMessage = `Left bounds are only valid when paired with right bounds.`
export type UnpairedLeftBoundMessage = typeof unpairedLeftBoundMessage

type UnboundableMessage<Root extends string> =
    `Bounded expression '${Root}' must be a number-or-string-typed keyword or a list-typed expression.`
const unboundableMessage = <Root extends string>(
    Root: Root
): UnboundableMessage<Root> =>
    `Bounded expression '${Root}' must be a number-or-string-typed keyword or a list-typed expression.`
