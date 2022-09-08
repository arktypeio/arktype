import {
    literalToNumber,
    NumberLiteralDefinition,
    numberLiteralNode
} from "../../operand/unenclosed/numberLiteral.js"
import {
    Bound,
    boundableNode,
    BoundableNode,
    BoundDefinition,
    boundsConstraint,
    isBoundable,
    LowerBoundDefinition,
    UpperBoundDefinition
} from "./bound.js"
import {
    Comparator,
    constrainableNode,
    doubleBoundComparators,
    invalidDoubleBoundMessage,
    InvalidDoubleBoundMessage,
    Node,
    NodeToString,
    Parser
} from "./common.js"

export const parseSuffix = (
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
        : s.error(nonSuffixRightBoundMessage(token, boundingValue))
}

export type ParseSuffix<
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
    : Parser.State.Error<NonSuffixRightBoundMessage<Token, S["R"]>>

type BoundingValueWithSuffix<
    BoundingValue extends number,
    NextSuffix extends "?",
    Unscanned extends string
> = `${BoundingValue}${NextSuffix}${Unscanned}`

export const reduceRight = (
    s: Parser.state<Parser.left.suffix>,
    right: BoundDefinition,
    nextSuffix: Parser.SuffixToken,
    ctx: Node.context
) =>
    hasBoundableRoot(s)
        ? hasLowerBound(s)
            ? reduceDouble(s, right, nextSuffix, ctx)
            : reduceSingle(s, right, nextSuffix, ctx)
        : s.error(unboundableMessage(s.l.root.toString()))

export type ReduceRight<
    L extends Parser.Left.Suffix,
    RightBound extends BoundDefinition,
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

const hasLowerBound = (
    s: Parser.state.suffix
): s is Parser.state.suffix<{ lowerBound: LowerBoundDefinition }> =>
    !!s.l.lowerBound

type ReduceDouble<
    L extends Parser.Left.Suffix<{
        root: BoundableNode
        lowerBound: LowerBoundDefinition
    }>,
    RightBound extends BoundDefinition,
    NextSuffix extends Parser.SuffixToken
> = RightBound extends UpperBoundDefinition
    ? Parser.Left.SuffixFrom<{
          lowerBound: undefined
          root: Bound<L["root"], [L["lowerBound"], RightBound]>
          nextSuffix: NextSuffix
      }>
    : Parser.Left.Error<InvalidDoubleBoundMessage<RightBound[0]>>

const reduceDouble = (
    s: Parser.state<
        Parser.left.suffix<{
            root: constrainable
            lowerBound: LowerBoundDefinition
        }>
    >,
    right: BoundDefinition,
    nextSuffix: Parser.SuffixToken,
    ctx: Node.context
) => {
    if (isValidDoubleBoundRight(right)) {
        s.l.root = new bound(s.l.root, [s.l.lowerBound, right], ctx) as any
        s.l.lowerBound = undefined as any
        s.l.nextSuffix = nextSuffix
        return s
    }
    return s.error(invalidDoubleBoundMessage(right[0]))
}

type ReduceSingle<
    L extends Parser.Left.Suffix,
    Single extends BoundDefinition,
    NextSuffix extends Parser.SuffixToken
> = Parser.Left.SuffixFrom<{
    lowerBound: undefined
    root: Bound<L["root"], [Single]>
    nextSuffix: NextSuffix
}>

const reduceSingle = (
    s: Parser.state.suffix<{ root: constrainableNode<boundsConstraint> }>,
    right: BoundDefinition,
    nextSuffix: Parser.SuffixToken,
    ctx: Node.context
) => {
    s.l.root.constraints.push(new boundsConstraint([right]))
    s.l.lowerBound = undefined
    s.l.nextSuffix = nextSuffix
    return s
}

const isValidDoubleBoundRight = (
    right: BoundDefinition
): right is UpperBoundDefinition =>
    Parser.inTokenSet(right[0], doubleBoundComparators)

export const unpairedLeftBoundMessage = `Left bounds are only valid when paired with right bounds.`

export type UnpairedLeftBoundMessage = typeof unpairedLeftBoundMessage

type UnboundableMessage<Root extends string> =
    `Bounded expression '${Root}' must be a number-or-string-typed keyword or a list-typed expression.`

export const unboundableMessage = <Root extends string>(
    Root: Root
): UnboundableMessage<Root> =>
    `Bounded expression '${Root}' must be a number-or-string-typed keyword or a list-typed expression.`

export type NonSuffixRightBoundMessage<
    T extends Comparator,
    Suffix extends string
> = `Right bound ${T} must be followed by a number literal and zero or more additional suffix tokens (got '${Suffix}').`

export const nonSuffixRightBoundMessage = <
    Token extends Comparator,
    Suffix extends string
>(
    t: Token,
    suffix: Suffix
): NonSuffixRightBoundMessage<Token, Suffix> =>
    `Right bound ${t} must be followed by a number literal and zero or more additional suffix tokens (got '${suffix}').`

const untilNextSuffix: Parser.scanner.UntilCondition = (scanner) =>
    scanner.lookahead === "?"
