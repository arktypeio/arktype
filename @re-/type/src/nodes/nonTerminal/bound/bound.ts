// TODO: Remove
/* eslint-disable max-lines */
import { RequireKeys, toNumber } from "@re-/tools"
import { Base } from "../../base/index.js"
import { Lexer } from "../../parser/lexer.js"
import { State } from "../../parser/state.js"
import { boundStartChars, boundTokens, tokenSet } from "../../parser/tokens.js"
import { Tree } from "../../parser/tree.js"
import {
    Keyword,
    NumberLiteralDefinition,
    NumberLiteralNode
} from "../../terminal/index.js"
import { NonTerminal } from "../nonTerminal.js"

export namespace Bound {
    export const tokens = boundTokens

    export const startChars = boundStartChars

    export const doubleBoundTokens = tokenSet({
        "<": 1,
        "<=": 1
    })

    export type Token = keyof typeof tokens

    export type StartChar = keyof typeof startChars

    export type DoubleBoundToken = keyof typeof doubleBoundTokens

    export type PartialBoundsDefinition = {
        left?: Left
        right?: Right
    }

    export type ValidatedBoundsDefinition = ValidSingleBound | ValidDoubleBound

    type ValidSingleBound = {
        right: [Bound.Token, NumberLiteralDefinition]
    }

    export const isDoubleBoundDefinition = (
        bounds: ValidatedBoundsDefinition
    ): bounds is ValidDoubleBound => (bounds as any).left === undefined

    type ValidDoubleBound = {
        left: [NumberLiteralDefinition, Bound.DoubleBoundToken]
        right: [Bound.DoubleBoundToken, NumberLiteralDefinition]
    }

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
              `Right bound ${S["scanner"]["lookahead"]} must be a number literal followed only by other suffixes.`
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
            s.bounds.right = [token, s.scanner.lookahead]
            if (!isBoundable(s.root)) {
                throw new Error(
                    `Bounded expression '${s.root.toString()}' must be a number-or-string-typed keyword or a list-typed expression.`
                )
            }
            const validatedBounds = validateBounds(s.bounds)
            s.root = new BoundNode(s.root, validatedBounds, ctx)
            Lexer.shiftOperator(s.scanner)
        } else {
            throw new Error(
                `Right side of comparator ${s.scanner.lookahead} must be a number literal.`
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

    const validateBounds = (bounds: PartialBoundsDefinition) => {
        if (bounds.left) {
            if (!bounds.right) {
                throw new Error(unpairedLeftBoundMessage)
            }
            if (!(bounds.right[0] in doubleBoundTokens)) {
                throw new Error(
                    invalidDoubleBoundMessage(bounds.left[1], bounds.right[0])
                )
            }
        }
        return bounds as ValidatedBoundsDefinition
    }
}

export interface Boundable extends Base.Node {
    boundBy?: string
    toBound(value: unknown): number
}

export const isBoundable = (node: Base.Node): node is Boundable =>
    "toBound" in node

export class BoundNode extends NonTerminal<Boundable> {
    left?: [number, Bound.DoubleBoundToken]
    right: [Bound.Token, number]

    constructor(
        child: Boundable,
        bounds: Bound.ValidatedBoundsDefinition,
        ctx: Base.Parsing.Context
    ) {
        super(child, ctx)
        if (Bound.isDoubleBoundDefinition(bounds)) {
            this.left = [toNumber(bounds.left[0]), bounds.left[1]]
        }
        this.right = [bounds.right[0], toNumber(bounds.right[1])]
    }

    toString() {
        let result = ""
        if (this.left) {
            result += `${this.left[0]}${this.left[1]}`
        }
        result += this.children.toString()
        result += `${this.right[0]}${this.right[1]}`
        return result
    }

    // TODO: Remove this once bounds are converted over
    // eslint-disable-next-line max-lines-per-function
    allows(args: Base.Validation.Args) {
        const boundedNode = this.children
        if (!boundedNode.allows(args)) {
            return false
        }
        const boundedValue = boundedNode.toBound(args.value)
        // for (const [comparator, bound] of this.bounds!) {
        //     const boundDescription = `${bound}${
        //         boundedNode.boundBy ? " " + boundedNode.boundBy : ""
        //     }`
        //     if (comparator === "<=" && boundedValue > bound) {
        //         return this.addBoundError(
        //             "less than or equal to",
        //             boundedValue,
        //             boundDescription,
        //             args
        //         )
        //     } else if (comparator === ">=" && boundedValue < bound) {
        //         return this.addBoundError(
        //             "greater than or equal to",
        //             boundedValue,
        //             boundDescription,
        //             args
        //         )
        //     } else if (comparator === "<" && boundedValue >= bound) {
        //         return this.addBoundError(
        //             "less than",
        //             boundedValue,
        //             boundDescription,
        //             args
        //         )
        //     } else if (comparator === ">" && boundedValue <= bound) {
        //         return this.addBoundError(
        //             "greater than",
        //             boundedValue,
        //             boundDescription,
        //             args
        //         )
        //     } else if (comparator === "==" && boundedValue !== bound) {
        //         return this.addBoundError(
        //             // Error message is cleaner without token name for equality check
        //             "",
        //             boundedValue,
        //             boundDescription,
        //             args
        //         )
        //     }
        // }
        return true
    }

    generate() {
        throw new Base.Create.UngeneratableError(
            this.toString(),
            "Bounded generation is unsupported."
        )
    }

    private addBoundError(
        comparatorName: string,
        boundedValue: number,
        boundDescription: string,
        args: Base.Validation.Args
    ) {
        args.errors.add(
            args.ctx.path,
            `Must be ${comparatorName} ${boundDescription} (got ${boundedValue}).`
        )
        return false
    }
}
