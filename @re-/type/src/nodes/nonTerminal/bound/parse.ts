// TODO: Remove
/* eslint-disable max-lines */
import { toNumber } from "@re-/tools"
import { Base } from "../../base/index.js"
import {
    boundStartChars,
    boundTokens,
    Lexer,
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
    export const tokens = boundTokens

    export const startChars = boundStartChars

    export const doubleBoundTokens = tokenSet({
        "<": 1,
        "<=": 1
    })

    export const isDoubleBoundToken = (
        token: string
    ): token is DoubleBoundToken => token in doubleBoundTokens

    export type Token = keyof typeof tokens

    export type StartChar = keyof typeof startChars

    export type DoubleBoundToken = keyof typeof doubleBoundTokens

    export type PartialBoundsDefinition = {
        left?: Left
        right?: Right
    }

    export type DoubleBoundCandidate = Required<PartialBoundsDefinition>

    export const isDoubleBoundCandidate = (
        bounds: PartialBoundsDefinition
    ): bounds is DoubleBoundCandidate => "left" in bounds && "right" in bounds

    export type Left = [NumberLiteralDefinition, DoubleBoundToken]

    export type Right = [Token, NumberLiteralDefinition]

    /** A BoundableNode must be either:
     *    1. A number-typed keyword terminal (e.g. "integer" in "integer>5")
     *    2. A string-typed keyword terminal (e.g. "alphanum" in "100>alphanum")
     *    3. Any list node (e.g. "(string|number)[]" in "(string|number)[]>0")
     */
    export type Boundable =
        | Keyword.OfTypeNumber
        | Keyword.OfTypeString
        | [unknown, "[]"]

    export type ShiftToken<
        Start extends StartChar,
        Unscanned extends string[]
    > = Unscanned extends Lexer.Scan<infer Lookahead, infer NextUnscanned>
        ? Lookahead extends "="
            ? State.ScannerFrom<{
                  lookahead: `${Start}=`
                  unscanned: NextUnscanned
              }>
            : Start extends "="
            ? Lexer.ShiftError<
                  Unscanned,
                  `= is not a valid comparator. Use == instead.`
              >
            : State.ScannerFrom<{
                  lookahead: Start
                  unscanned: Unscanned
              }>
        : Lexer.ShiftError<[], `Expected a bound condition after ${Start}.`>

    export const shiftToken = (scanner: Lexer.Scanner<Bound.StartChar>) => {
        if (scanner.next === "=") {
            scanner.shift()
        } else if (scanner.lookahead === "=") {
            throw new Error(`= is not a valid comparator. Use == instead.`)
        }
    }

    type InvalidLeftBoundMessage<T extends Token> =
        `Left-side bound values must specify a lower bound using < or <= (got ${T}).`

    export const invalidLeftBoundMessage = <T extends Token>(
        token: T
    ): InvalidLeftBoundMessage<T> =>
        `Left-side bound values must specify a lower bound using < or <= (got ${token}).`

    export type ParsePossibleLeft<
        S extends State.Type,
        N extends NumberLiteralDefinition
    > = S["scanner"]["lookahead"] extends DoubleBoundToken
        ? Bound.ParseLeft<S, S["scanner"]["lookahead"], N>
        : S["scanner"]["lookahead"] extends Token
        ? State.Error<S, InvalidLeftBoundMessage<S["scanner"]["lookahead"]>>
        : State.SetRoot<S, N>

    export const parsePossibleLeft = (s: State.WithRoot<NumberLiteralNode>) => {
        if (State.lookaheadIn(s, doubleBoundTokens)) {
            parseLeft(s)
        } else if (State.lookaheadIn(s, Bound.tokens)) {
            throw new Error(invalidLeftBoundMessage(s.scanner.lookahead))
        }
    }

    export type ParseLeft<
        S extends State.Type,
        T extends DoubleBoundToken,
        N extends NumberLiteralDefinition
    > = State.From<{
        groups: S["groups"]
        branches: S["branches"]
        bounds: {
            left: [N, T]
        }
        root: undefined
        scanner: Lexer.ShiftBase<S["scanner"]["unscanned"]>
    }>

    export const parseLeft = (
        s: State.WithLookaheadAndRoot<Bound.DoubleBoundToken, NumberLiteralNode>
    ) => {
        s.bounds.left = [s.root.def, s.scanner.lookahead]
        s.root = undefined as any
        Lexer.shiftBase(s.scanner)
    }

    export type ParseRight<
        S extends State.Type,
        T extends Token
    > = S["scanner"]["lookahead"] extends NumberLiteralDefinition
        ? "right" extends keyof S["bounds"]
            ? State.Error<S, `Definitions cannot have multiple right bounds.`>
            : S["root"] extends Boundable
            ? State.From<{
                  groups: S["groups"]
                  branches: S["branches"]
                  bounds: {
                      left: S["bounds"]["left"]
                      right: [T, S["scanner"]["lookahead"]]
                  }
                  root: S["root"]
                  scanner: Lexer.ShiftOperator<S["scanner"]["unscanned"]>
              }>
            : State.Error<
                  S,
                  `Bounded expression '${Tree.ToString<
                      S["root"]
                  >}' must be a number-or-string-typed keyword or a list-typed expression.`
              >
        : State.Error<
              S,
              `Right side of ${T} must be a number literal (got '${S["scanner"]["lookahead"]}').`
          >

    export const parseRight = (
        s: State.WithLookaheadAndRoot<Bound.Token>,
        ctx: Base.Parsing.Context
    ) => {
        const token = s.scanner.lookahead
        Lexer.shiftBase(s.scanner)
        if (NumberLiteralNode.matches(s.scanner.lookahead)) {
            if (s.bounds.right) {
                throw new Error(
                    `Definitions cannot have multiple right bounds.`
                )
            }
            s.root = createBound(s, [token, s.scanner.lookahead], ctx)
            Lexer.shiftOperator(s.scanner)
        } else {
            throw new Error(
                `Right side of ${token} must be a number literal (got '${s.scanner.lookahead}').`
            )
        }
    }

    export const unpairedLeftBoundMessage = `Left bounds are only valid when paired with right bounds.`
    type UnpairedLeftBoundMessage = typeof unpairedLeftBoundMessage

    type InvalidDoubleBoundMessage<
        Left extends Token,
        Right extends Token
    > = `Right-side bound token ${Right} is redundant or incompatible with left-side token ${Left}.`

    export const invalidDoubleBoundMessage = <
        Left extends Token,
        Right extends Token
    >(
        left: Left,
        right: Right
    ): InvalidDoubleBoundMessage<Left, Right> =>
        `Right-side bound token ${right} is redundant or incompatible with left-side token ${left}.`

    const createBound = (
        s: State.WithRoot,
        right: Right,
        ctx: Base.Parsing.Context
    ) => {
        s.bounds.right = right
        if (!isBoundable(s.root)) {
            throw new Error(
                `Bounded expression '${s.root.toString()}' must be a number-or-string-typed keyword or a list-typed expression.`
            )
        }
        if (isDoubleBoundCandidate(s.bounds)) {
            return new DoubleBoundNode(
                s.root,
                validateDoubleBound(s.bounds),
                ctx
            )
        } else {
            return new SingleBoundNode(
                s.root,
                validateSingleBound(s.bounds.right),
                ctx
            )
        }
    }

    export type ValidateBounds<S extends State.Type> =
        S["bounds"]["left"] extends Left
            ? S["bounds"]["right"] extends Right
                ? S["bounds"]["right"][0] extends DoubleBoundToken
                    ? S
                    : State.Error<
                          S,
                          InvalidDoubleBoundMessage<
                              S["bounds"]["left"][1],
                              S["bounds"]["right"][0]
                          >
                      >
                : State.Error<S, UnpairedLeftBoundMessage>
            : S

    const validateSingleBound = (bound: Right): SingleBoundDefinition => {
        return [bound[0], toNumber(bound[1])]
    }

    const validateDoubleBound = (
        bounds: Bound.DoubleBoundCandidate
    ): DoubleBoundDefinition => {
        // TODO: get this to work at runtime.
        if (!bounds.right) {
            throw new Error(unpairedLeftBoundMessage)
        }
        if (!isDoubleBoundToken(bounds.right[0])) {
            throw new Error(
                invalidDoubleBoundMessage(bounds.left[1], bounds.right[0])
            )
        }
        return {
            lower: [toNumber(bounds.left[0]), bounds.left[1]],
            upper: [bounds.right[0], toNumber(bounds.right[1])]
        }
    }
}
