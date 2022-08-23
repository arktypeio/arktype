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
    Left,
    left,
    Scanner,
    state,
    State,
    Tokens,
    Tree,
    UntilCondition
} from "../../parser/index.js"
import { DoubleBoundDefinition, DoubleBoundNode } from "./double.js"
import { BoundableNode, isBoundable } from "./shared.js"
import { SingleBoundNode } from "./single.js"

export type Bounds = {
    left?: LeftDefinition
    right?: RightDefinition
}

export const tokens = Tokens.boundTokens

export const chars = Tokens.boundChars

export type Comparator = keyof typeof tokens

export type ComparatorChar = keyof typeof chars

export type DoubleBoundComparator = keyof typeof doubleBoundTokens

export const doubleBoundTokens = Tokens.tokenSet({
    "<": 1,
    "<=": 1
})

const singleCharBoundTokens = Tokens.tokenSet({
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

export const parse = (s: state<left.withRoot>, start: ComparatorChar) => {
    if (s.r.lookahead === "=") {
        s.r.shift()
        reduce(s, `${start}${s.r.lookahead}`)
    } else if (Tokens.inTokenSet(start, singleCharBoundTokens)) {
        reduce(s, start)
    } else {
        throw new Error(singleEqualsMessage)
    }
    return s
}

export type Parse<
    S extends State,
    Start extends ComparatorChar,
    Unscanned extends string
> = Unscanned extends Scanner.Shift<"=", infer Rest>
    ? State.From<{ L: Reduce<S["L"], `${Start}=`>; R: Rest }>
    : Start extends SingleCharComparator
    ? State.From<{ L: Reduce<S["L"], Start>; R: Unscanned }>
    : State.Error<SingleEqualsMessage>

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

export const reduce = (s: state<left.withRoot>, token: Comparator) =>
    s.hasRoot(NumberLiteralNode) ? reduceLeft(s, token) : s.suffixed(token)

export type Reduce<
    L extends Left.Base,
    Token extends Comparator
> = L extends Left.WithRoot<NumberLiteralDefinition<infer BoundingValue>>
    ? ReduceLeft<L, Token, BoundingValue>
    : Left.SetNextSuffix<L, Token>

const applyLeftBound = (
    s: state<left.withRoot<NumberLiteralNode>>,
    token: DoubleBoundComparator
) => {
    s.l.bounds.left = [s.l.root.value, token]
    s.l.root = undefined as any
    return s
}

const reduceLeft = (
    s: state<left.withRoot<NumberLiteralNode>>,
    token: Comparator
) =>
    s.isPrefixable()
        ? Tokens.inTokenSet(token, doubleBoundTokens)
            ? applyLeftBound(s, token)
            : state.error(invalidDoubleBoundMessage(token))
        : state.error(nonPrefixLeftBoundMessage(s.l.root.value, token))

type ReduceLeft<
    L extends Left.Base,
    T extends Comparator,
    BoundingValue extends number
> = Left.IsPrefixable<L> extends true
    ? T extends DoubleBoundComparator
        ? Left.From<{
              groups: []
              branches: {}
              root: undefined
              bounds: { left: [BoundingValue, T] }
          }>
        : Left.Error<InvalidDoubleBoundMessage<T>>
    : Left.Error<NonPrefixLeftBoundMessage<BoundingValue, T>>

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

const untilNextSuffix: UntilCondition = (scanner) => scanner.lookahead === "?"

export const parseRight = (
    s: state<left.suffix>,
    token: Comparator,
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
        : state.error(rightBoundSuffixMessage(token, boundingValue))
}

export type ParseRight<
    S extends State.Of<Left.Suffix>,
    T extends Comparator
> = S["R"] extends BoundingValueWithSuffix<
    infer Value,
    infer NextSuffix,
    infer Unscanned
>
    ? State.From<{
          L: ReduceRight<S["L"], [T, Value], NextSuffix>
          R: Unscanned
      }>
    : S["R"] extends NumberLiteralDefinition<infer BoundingValue>
    ? State.From<{
          L: ReduceRight<S["L"], [T, BoundingValue], "END">
          R: ""
      }>
    : State.Error<RightBoundSuffixMessage<T, S["R"]>>

type BoundingValueWithSuffix<
    BoundingValue extends number,
    NextSuffix extends "?",
    Unscanned extends string
> = `${BoundingValue}${NextSuffix}${Unscanned}`

export const reduceRight = (
    s: state<left.suffix>,
    right: RightDefinition,
    nextSuffix: Tokens.SuffixToken,
    ctx: Node.Context
) =>
    hasBoundableRoot(s)
        ? hasLeftBound(s)
            ? reduceDouble(s, right, nextSuffix, ctx)
            : reduceSingle(s, right, nextSuffix, ctx)
        : state.error(unboundableMessage(s.l.root.toString()))

export type ReduceRight<
    L extends Left.Suffix,
    R extends RightDefinition,
    NextSuffix extends Tokens.SuffixToken
> = HasBoundableRoot<L> extends true
    ? HasLeftBound<L> extends true
        ? ReduceDouble<L, R, NextSuffix>
        : ReduceSingle<L, R, NextSuffix>
    : Left.Error<UnboundableMessage<Tree.ToString<L["root"]>>>

type HasBoundableRoot<L extends Left.Suffix> = L["root"] extends BoundableT
    ? true
    : false

const hasBoundableRoot = (
    s: state<left.suffix>
): s is state<left.suffix<{ root: BoundableNode }>> => isBoundable(s.l.root)

type HasLeftBound<L extends Left.Suffix> = "left" extends keyof L ? true : false

const hasLeftBound = (
    s: state<left.suffix>
): s is state<left.suffix<{ bounds: Required<Bounds> }>> => "left" in s.l.bounds

type ReduceDouble<
    L extends Left.Suffix,
    R extends RightDefinition,
    NextSuffix extends Tokens.SuffixToken
> = IsValidDoubleBound<R[0]> extends true
    ? Left.SuffixFrom<{
          bounds: {
              left: L["bounds"]["left"]
              right: R
          }
          root: L["root"]
          nextSuffix: NextSuffix
      }>
    : Left.Error<InvalidDoubleBoundMessage<R[0]>>

const reduceDouble = (
    s: state<left.suffix<{ root: BoundableNode; bounds: Required<Bounds> }>>,
    right: RightDefinition,
    nextSuffix: Tokens.SuffixToken,
    ctx: Node.Context
) => {
    s.l.bounds.right = right
    s.l.nextSuffix = nextSuffix
    if (isValidDoubleBound(s.l.bounds)) {
        s.l.root = new DoubleBoundNode(s.l.root, s.l.bounds, ctx) as any
        return s
    }
    return state.error(invalidDoubleBoundMessage(right[0]))
}

type ReduceSingle<
    L extends Left.Suffix,
    R extends RightDefinition,
    NextSuffix extends Tokens.SuffixToken
> = Left.SuffixFrom<{
    bounds: {
        right: R
    }
    root: L["root"]
    nextSuffix: NextSuffix
}>

//TODO: Try out types to stop casting to any?
const reduceSingle = (
    s: state<left.suffix<{ root: BoundableNode }>>,
    right: RightDefinition,
    nextSuffix: Tokens.SuffixToken,
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
    Tokens.inTokenSet(bounds.right[0], doubleBoundTokens)

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
