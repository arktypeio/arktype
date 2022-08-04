// TODO: Remove
/* eslint-disable max-lines */
import { asNumber } from "@re-/tools"
import { Base } from "../base/index.js"
import { Lexer } from "../parser/lexer.js"
import { ParserState } from "../parser/state.js"
import { boundStartChars, boundTokens } from "../parser/tokens.js"
import { ParseTree } from "../parser/tree.js"
import {
    Keyword,
    NumberLiteralDefinition,
    NumberLiteralNode
} from "../terminal/index.js"
import { NonTerminal } from "./nonTerminal.js"

export namespace Bound {
    export const tokens = boundTokens

    export const startChars = boundStartChars

    export type Token = keyof typeof tokens

    export type StartChar = keyof typeof startChars

    export type State = {
        left?: [NumberLiteralDefinition, Token]
        right?: [Token, NumberLiteralDefinition]
    }

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
            ? ParserState.RightFrom<{
                  lookahead: `${Start}=`
                  unscanned: NextUnscanned
              }>
            : Start extends "="
            ? Lexer.ShiftError<
                  Unscanned,
                  `= is not a valid comparator. Use == instead.`
              >
            : ParserState.RightFrom<{
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

    export type ParseLeft<
        S extends ParserState.Type,
        T extends Token,
        N extends NumberLiteralDefinition
    > = ParserState.From<{
        L: {
            groups: []
            branches: {}
            root: undefined
            ctx: S["L"]["ctx"] & {
                bounds: {
                    left: [N, T]
                }
            }
        }
        R: Lexer.ShiftBase<S["R"]["unscanned"]>
    }>

    export const parseLeft = (
        s: ParserState.WithLookaheadAndRoot<Bound.Token, NumberLiteralNode>
    ) => {
        s.bounds.left = [s.root.value, s.scanner.lookahead]
        s.root = undefined as any
        Lexer.shiftBase(s.scanner)
    }

    export type ParseRight<
        S extends ParserState.Type,
        T extends Token
    > = S["R"]["lookahead"] extends NumberLiteralDefinition
        ? "right" extends keyof S["L"]["ctx"]["bounds"]
            ? ParserState.Error<
                  S,
                  `Definitions cannot have multiple right bounds.`
              >
            : S["L"]["root"] extends Boundable
            ? ParserState.From<{
                  L: ParserState.UpdateContext<
                      S["L"],
                      {
                          bounds: {
                              right: [T, S["R"]["lookahead"]]
                          }
                      }
                  >
                  R: Lexer.ShiftOperator<S["R"]["unscanned"]>
              }>
            : ParserState.Error<
                  S,
                  `Bounded expression '${ParseTree.ToString<
                      S["L"]["root"]
                  >}' must be a number-or-string-typed keyword or a list-typed expression.`
              >
        : ParserState.Error<
              S,
              `Right bound ${S["R"]["lookahead"]} must be a number literal followed only by other suffixes.`
          >

    export const parseRight = (
        s: ParserState.WithLookaheadAndRoot<Bound.Token>,
        ctx: Base.Parsing.Context
    ) => {
        Lexer.shiftBase(s.scanner)
        if (NumberLiteralNode.matches(s.scanner.lookahead)) {
            if (s.bounds.right) {
                throw new Error(
                    `Definitions cannot have multiple right bounds.`
                )
            }
            s.bounds.right = [
                s.scanner.lookahead,
                asNumber(s.scanner.lookahead, { assert: true })
            ]
            if (!isBoundable(s.root)) {
                throw new Error(
                    `Bounded expression '${s.root.toString()}' must be a number-or-string-typed keyword or a list-typed expression.`
                )
            }
            s.root = new BoundNode(s.root, s.bounds, ctx)
            Lexer.shiftOperator(s.scanner)
        } else {
            throw new Error(
                `Right side of comparator ${s.scanner.lookahead} must be a number literal.`
            )
        }
    }
}

export interface Boundable extends Base.Node {
    boundBy?: string
    toBound(value: unknown): number
}

export const isBoundable = (node: Base.Node): node is Boundable =>
    "toBound" in node

export type NodeBounds = {
    left?: [number, Bound.Token]
    right?: [Bound.Token, number]
}

export class BoundNode extends NonTerminal<Boundable> {
    constructor(
        child: Boundable,
        private bounds: NodeBounds,
        ctx: Base.Parsing.Context
    ) {
        super(child, ctx)
    }

    toString() {
        let result = ""
        if (this.bounds.left) {
            result += this.bounds.left.join("")
        }
        result += this.children.toString()
        if (this.bounds.right) {
            result += this.bounds.right.join("")
        }
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
