// TODO: Remove
/* eslint-disable max-lines */
import { toNumber } from "@re-/tools"
import { Base } from "../../base/index.js"
import {
    boundStartChars,
    boundTokens,
    ErrorToken,
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

    export type Char = keyof typeof startChars

    export type DoubleBoundToken = keyof typeof doubleBoundTokens

    export type Raw = {
        left?: RawLeft
        right?: RawRight
    }

    export type RawLeft = [unknown, Token]

    export type RawRight = [Token, unknown]

    export type RawDouble = Required<Raw>

    export type RawSingle = { right: RawRight }

    export const isDoubleBoundCandidate = (bounds: Raw): bounds is RawDouble =>
        "left" in bounds && "right" in bounds

    /** A BoundableNode must be either:
     *    1. A number-typed keyword terminal (e.g. "integer" in "integer>5")
     *    2. A string-typed keyword terminal (e.g. "alphanum" in "100>alphanum")
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

    type InvalidDoubleBoundMessage<T extends Token> =
        `Double-bound expressions must specify their bounds using < or <= (got ${T}).`

    export const invalidDoubleBoundMessage = <T extends Token>(
        T: T
    ): InvalidDoubleBoundMessage<T> =>
        `Double-bound expressions must specify their bounds using < or <= (got ${T}).`

    type NonNumericBoundMessage<Value extends string> =
        `Bounding values must be specified using a number literal (got '${Value}').`

    export const nonNumericBoundingMessage = <Value extends string>(
        Value: Value
    ): NonNumericBoundMessage<Value> =>
        `Bounding values must be specified using a number literal (got '${Value}').`

    export type Validate<Bounds extends Raw, Expression> = {} extends Bounds
        ? Bounds
        : CheckEach<ValidateEach<Bounds>, Expression>

    type CheckEach<
        ValidatedBounds extends BoundValidationResult,
        Expression
    > = ValidatedBounds["left"] extends ErrorToken<string>
        ? ValidatedBounds["left"]
        : ValidatedBounds["right"] extends ErrorToken<string>
        ? ValidatedBounds["right"]
        : Expression extends Boundable
        ? ValidatedBounds
        : ErrorToken<`Bounded expression '${Tree.ToString<Expression>}' must be a number-or-string-typed keyword or a list-typed expression.`>

    type BoundValidationResult = {
        left?: [NumberLiteralDefinition, DoubleBoundToken] | ErrorToken<string>
        right?: [Token, NumberLiteralDefinition] | ErrorToken<string>
    }

    type ValidateEach<Bounds extends Raw> = Bounds extends RawDouble
        ? ValidateDoubleBound<Bounds>
        : Bounds extends RawSingle
        ? ValidateSingleBound<Bounds>
        : {
              left: ErrorToken<UnpairedLeftBoundMessage>
          }

    type ValidateDoubleBound<Bounds extends RawDouble> = {
        left: ValidateDoubleBoundSide<Bounds["left"][0], Bounds["left"][1]>
        right: ValidateDoubleBoundSide<Bounds["right"][1], Bounds["right"][0]>
    }

    type ValidateDoubleBoundSide<
        Value,
        T extends Token
    > = Value extends NumberLiteralDefinition
        ? T extends DoubleBoundToken
            ? [Value, T]
            : ErrorToken<InvalidDoubleBoundMessage<T>>
        : ErrorToken<NonNumericBoundMessage<Value & string>>

    type ValidateSingleBound<Bounds extends RawSingle> = {
        right: Bounds["right"][1] extends NumberLiteralDefinition
            ? Bounds
            : ErrorToken<NonNumericBoundMessage<Bounds["right"][1] & string>>
    }

    export const parsePossibleLeft = (s: State.WithRoot<NumberLiteralNode>) => {
        if (State.lookaheadIn(s, doubleBoundTokens)) {
            parseLeft(s)
        } else if (State.lookaheadIn(s, Bound.tokens)) {
            // TODO: Fix
            throw new Error("Must be < or <=.")
        }
    }

    export const parseLeft = (
        s: State.WithLookaheadAndRoot<Bound.DoubleBoundToken, NumberLiteralNode>
    ) => {
        s.bounds.left = [s.root.def, s.scanner.lookahead]
        s.root = undefined as any
        Lexer.shiftBase(s.scanner)
    }

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

    const createBound = (
        s: State.WithRoot,
        right: RawRight,
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

    const validateSingleBound = (bound: RawRight): SingleBoundDefinition => {
        return [bound[0], toNumber(bound[1])]
    }

    const validateDoubleBound = (
        bounds: Bound.RawDouble
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
