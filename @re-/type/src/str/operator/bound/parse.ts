// TODO: Remove
/* eslint-disable max-lines */
import {
    NumberLiteralDefinition,
    numberLiteralNode
} from "../../operand/unenclosed/numberLiteral.js"
import {
    BoundableNode,
    boundableNode,
    Comparator,
    ComparatorChar,
    isBoundable,
    Node,
    NodeToString,
    Operator,
    Parser
} from "./common.js"
import {
    DoubleBoundComparator,
    doubleBoundNode,
    doubleBoundTokens,
    LowerBoundDefinition,
    UpperBoundDefinition
} from "./double.js"
import { SingleBoundDefinition, singleBoundNode } from "./single.js"

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

type InvalidDoubleBoundMessage<T extends Comparator> =
    `Double-bound expressions must specify their bounds using < or <= (got ${T}).`

const invalidDoubleBoundMessage = <T extends Comparator>(
    T: T
): InvalidDoubleBoundMessage<T> =>
    `Double-bound expressions must specify their bounds using < or <= (got ${T}).`

type NonPrefixLeftBoundMessage<
    BoundingValue extends NumberLiteralDefinition,
    T extends Comparator
> = `Left bound '${BoundingValue}${T}...' must occur at the beginning of the definition.`

const nonPrefixLeftBoundMessage = <
    BoundingValue extends NumberLiteralDefinition,
    T extends Comparator
>(
    Value: BoundingValue,
    T: T
): NonPrefixLeftBoundMessage<BoundingValue, T> =>
    `Left bound '${Value}${T}...' must occur at the beginning of the definition.`

export const reduce = (s: Operator.state, token: Comparator) =>
    s.hasRoot(numberLiteralNode) ? reduceLeft(s, token) : s.suffixed(token)

export type Reduce<
    L extends Parser.Left,
    Token extends Comparator
> = L extends { root: NumberLiteralDefinition }
    ? ReduceLeft<L, Token>
    : Parser.Left.SetNextSuffix<L, Token>

const applyLeftBound = (
    s: Parser.state<Parser.left.withRoot<numberLiteralNode>>,
    token: DoubleBoundComparator
) => {
    s.l.lowerBound = [s.l.root.def, token]
    s.l.root = undefined as any
    return s
}

const reduceLeft = (
    s: Parser.state<Parser.left.withRoot<numberLiteralNode>>,
    token: Comparator
) =>
    s.isPrefixable()
        ? Parser.inTokenSet(token, doubleBoundTokens)
            ? applyLeftBound(s, token)
            : s.error(invalidDoubleBoundMessage(token))
        : s.error(nonPrefixLeftBoundMessage(s.l.root.def, token))

type ReduceLeft<
    L extends Parser.Left.WithRoot<NumberLiteralDefinition>,
    T extends Comparator
> = Parser.Left.IsPrefixable<L> extends true
    ? T extends DoubleBoundComparator
        ? Parser.Left.From<{
              groups: []
              branches: {}
              root: undefined
              lowerBound: [L["root"], T]
          }>
        : Parser.Left.Error<InvalidDoubleBoundMessage<T>>
    : Parser.Left.Error<NonPrefixLeftBoundMessage<L["root"], T>>

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
    return numberLiteralNode.matches(boundingValue)
        ? reduceRight(s, [token, boundingValue], nextSuffix, ctx)
        : s.error(rightBoundSuffixMessage(token, boundingValue))
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
    : S["R"] extends NumberLiteralDefinition
    ? Parser.State.From<{
          L: ReduceRight<S["L"], [T, S["R"]], "END">
          R: ""
      }>
    : Parser.State.Error<RightBoundSuffixMessage<T, S["R"]>>

type BoundingValueWithSuffix<
    BoundingValue extends NumberLiteralDefinition,
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
    R extends SingleBoundDefinition,
    NextSuffix extends Parser.SuffixToken
> = L extends { root: BoundableNode }
    ? L extends { lowerBound: LowerBoundDefinition }
        ? ReduceDouble<L, R, NextSuffix>
        : ReduceSingle<L, R, NextSuffix>
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
    Right extends SingleBoundDefinition,
    NextSuffix extends Parser.SuffixToken
> = Right extends UpperBoundDefinition
    ? Parser.Left.SuffixFrom<{
          lowerBound: undefined
          root: [...L["lowerBound"], L["root"], ...Right]
          nextSuffix: NextSuffix
      }>
    : Parser.Left.Error<InvalidDoubleBoundMessage<Right[0]>>

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
        s.l.root = new doubleBoundNode(
            s.l.root,
            s.l.lowerBound,
            right,
            ctx
        ) as any
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
    root: [L["root"], Bound[0], Bound[1]]
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
    s.l.root = new singleBoundNode(s.l.root, right, ctx) as any
    return s
}

const isValidDoubleBoundRight = (
    right: SingleBoundDefinition
): right is UpperBoundDefinition =>
    Parser.inTokenSet(right[0], doubleBoundTokens)

export const unpairedLeftBoundMessage = `Left bounds are only valid when paired with right bounds.`
export type UnpairedLeftBoundMessage = typeof unpairedLeftBoundMessage

type UnboundableMessage<Root extends string> =
    `Bounded expression '${Root}' must be a number-or-string-typed keyword or a list-typed expression.`
const unboundableMessage = <Root extends string>(
    Root: Root
): UnboundableMessage<Root> =>
    `Bounded expression '${Root}' must be a number-or-string-typed keyword or a list-typed expression.`
