// TODO: Remove
/* eslint-disable max-lines */
import { isEmpty, toNumber } from "@re-/tools"
import { Base } from "../../base/index.js"
import {
    boundStartChars,
    boundTokens,
    ErrorToken,
    Left,
    Lexer,
    Scan,
    State,
    tokenSet,
    Tree
} from "../../parser/index.js"
import {
    Keyword,
    NumberLiteralDefinition,
    NumberLiteralNode
} from "../../terminal/index.js"
import { DoubleBoundDefinition, DoubleBoundNode } from "./double.js"
import { isBoundable } from "./shared.js"
import { SingleBoundDefinition, SingleBoundNode } from "./single.js"

export namespace Bound {
    export type T = {
        left?: Bound.Left
        bounded?: Boundable
        rightToken?: Bound.Token
    }

    export type V = {
        left?: Bound.Left
        bounded?: Boundable
        rightToken?: Bound.Token
    }

    export const tokens = boundTokens

    export const startChars = boundStartChars

    export type Token = keyof typeof tokens

    export type Char = keyof typeof startChars

    export type DoubleBoundToken = keyof typeof doubleBoundTokens

    export const doubleBoundTokens = tokenSet({
        "<": 1,
        "<=": 1
    })

    export const isDoubleBoundToken = (
        token: string
    ): token is DoubleBoundToken => token in doubleBoundTokens

    export type Left = [NumberLiteralDefinition, DoubleBoundToken]

    export type Right = [Token, NumberLiteralDefinition]

    /** A BoundableNode must be either:
     *    1. A number-typed keyword terminal (e.g. "integer" in "integer>5")
     *    2. A string-typed keyword terminal (e.g. "alphanum" in "100<alphanum")
     *    3. Any list node (e.g. "(string|number)[]" in "(string|number)[]>0")
     */
    export type Boundable =
        | Keyword.OfTypeNumber
        | Keyword.OfTypeString
        | [unknown, "[]"]

    export const shiftToken = (scanner: Lexer.ValueScanner<Bound.Char>) => {
        if (scanner.next === "=") {
            scanner.shift()
        } else if (scanner.lookahead === "=") {
            throw new Error(`= is not a valid comparator. Use == instead.`)
        }
    }

    type SingleCharBoundToken = ">" | "<"

    export type ShiftReduce<
        S extends State.T,
        Start extends Bound.Char,
        Unscanned extends string
    > = Unscanned extends Scan<infer PossibleSecondChar, infer Rest>
        ? PossibleSecondChar extends "="
            ? State.From<{ L: Bound.Reduce<S["L"], `${Start}=`>; R: Rest }>
            : Start extends SingleCharBoundToken
            ? State.From<{ L: Bound.Reduce<S["L"], Start>; R: Unscanned }>
            : State.Error<`= is not a valid comparator. Use == instead.`>
        : State.Error<`Expected a bound condition after ${Start}.`>

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

    export type Finalize<Root, Bounds extends T> = {} extends Bounds
        ? Root
        : IsUnpairedLeftBound<Bounds> extends true
        ? ErrorToken<UnpairedLeftBoundMessage>
        : Root extends NumberLiteralDefinition
        ? Bounds["bounded"]
        : ErrorToken<NonNumericBoundMessage<Tree.ToString<Root>>>

    const isUnpairedLeftBound = (bounds: T) =>
        !!bounds.left && !bounds.rightToken

    type IsUnpairedLeftBound<Bounds extends T> = "left" extends keyof Bounds
        ? "rightToken" extends keyof Bounds
            ? false
            : true
        : false

    export type Reduce<
        L extends Left.T,
        T extends Token
    > = L extends Left.WithRoot<NumberLiteralDefinition>
        ? ReduceLeft<L, T>
        : ReduceRight<L, T>

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

    type ReduceRight<
        L extends Left.T,
        T extends Bound.Token
    > = "rightToken" extends keyof L["bounds"]
        ? Left.Error<`Definitions may have at most one right bound.`>
        : L["root"] extends Boundable
        ? RightTokenIsValid<L, T> extends true
            ? Left.From<{
                  bounds: L["bounds"] & {
                      bounded: L["root"]
                      rightToken: T
                  }
                  groups: L["groups"]
                  branches: L["branches"]
                  root: undefined
              }>
            : Left.Error<InvalidDoubleBoundMessage<T>>
        : Left.Error<UnboundableMessage<Tree.ToString<L["root"]>>>

    type RightTokenIsValid<
        L extends Left.T,
        T extends Token
    > = "left" extends keyof L["bounds"]
        ? T extends DoubleBoundToken
            ? true
            : false
        : true

    // export const parsePossibleLeft = (s: State.WithRoot<NumberLiteralNode>) => {
    //     if (State.lookaheadIn(s, doubleBoundTokens)) {
    //         parseLeft(s)
    //     } else if (State.lookaheadIn(s, Bound.tokens)) {
    //         // TODO: Fix
    //         throw new Error("Must be < or <=.")
    //     }
    // }

    // export const parseLeft = (
    //     s: State.WithLookaheadAndRoot<Bound.DoubleBoundToken, NumberLiteralNode>
    // ) => {
    //     s.bounds.left = [s.root.def, s.scanner.lookahead]
    //     s.root = undefined as any
    //     Lexer.shiftBase(s.scanner)
    // }

    // export const parseRight = (
    //     s: State.WithLookaheadAndRoot<Bound.Token>,
    //     ctx: Base.Parsing.Context
    // ) => {
    //     const token = s.scanner.lookahead
    //     Lexer.shiftBase(s.scanner)
    //     if (NumberLiteralNode.matches(s.scanner.lookahead)) {
    //         if (s.bounds.right) {
    //             throw new Error(
    //                 `Definitions cannot have multiple right bounds.`
    //             )
    //         }
    //         s.root = createBound(s, [token, s.scanner.lookahead], ctx)
    //         Lexer.shiftOperator(s.scanner)
    //     } else {
    //         throw new Error(
    //             `Right side of ${token} must be a number literal (got '${s.scanner.lookahead}').`
    //         )
    //     }
    // }

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

    // const validateSingleBound = (bound: Right): SingleBoundDefinition => {
    //     return [bound[0], toNumber(bound[1])]
    // }

    // const validateDoubleBound = (
    //     bounds: Bound.RawDouble
    // ): DoubleBoundDefinition => {
    //     // TODO: get this to work at runtime.
    //     if (!bounds.right) {
    //         throw new Error(unpairedLeftBoundMessage)
    //     }
    //     if (!isDoubleBoundToken(bounds.right[0])) {
    //         throw new Error(
    //             invalidDoubleBoundMessage(bounds.left[1], bounds.right[0])
    //         )
    //     }
    //     return {
    //         lower: [toNumber(bounds.left[0]), bounds.left[1]],
    //         upper: [bounds.right[0], toNumber(bounds.right[1])]
    //     }
    // }
}
