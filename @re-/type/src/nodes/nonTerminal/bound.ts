import { Entry } from "@re-/tools"
import { Base } from "../base/index.js"
import { Parser } from "../parse.js"
import { ParserType } from "../parser.js"
import { Shift } from "../shift.js"
import type { NumberLiteralDefinition } from "../terminal/index.js"
import { NonTerminal } from "./nonTerminal.js"

// const invalidBoundError = (bound: string) =>
//     `Bounding value '${Base.defToString(bound)}' must be a number literal.`

const unboundableError = (inner: string) =>
    `Definition '${Base.defToString(inner)}' is not boundable.`

// const boundPartsErrorTemplate =
//     "Bounds must be either of the form D<N or N<D<N, where 'D' is a boundable definition, 'N' is a number literal, and '<' is a comparison token."

// const invertComparator = (token: ComparatorToken): ComparatorToken => {
//     switch (token) {
//         case "<=":
//             return ">="
//         case ">=":
//             return "<="
//         case "<":
//             return ">"
//         case ">":
//             return "<"
//         case "==":
//             return "=="
//     }
// }

export namespace Bound {
    export namespace T {
        export type Token = "<=" | ">=" | "<" | ">" | "=="

        export type ParseLeft<
            S extends ParserType.State,
            T extends Token,
            N extends NumberLiteralDefinition,
            Dict
        > = ParserType.StateFrom<{
            L: {
                groups: S["L"]["groups"]
                branches: S["L"]["branches"]
                expression: ""
                bounds: {
                    left: [N, T]
                }
            }
            R: Shift.Base<S["R"]["unscanned"], Dict>
        }>

        export type ParseRight<
            S extends ParserType.State,
            T extends Token,
            N extends NumberLiteralDefinition
        > = ParserType.StateFrom<{
            L: {
                groups: S["L"]["groups"]
                branches: S["L"]["branches"]
                expression: ""
                bounds: S["L"]["bounds"] & {
                    right: [T, N]
                }
            }
            R: Shift.Operator<S["R"]["unscanned"]>
        }>

        export type ParsePossibleRightBound<
            S extends ParserType.State,
            Dict
        > = S["R"]["lookahead"] extends Token
            ? ParseRightBound<
                  ParserType.StateFrom<{
                      L: S["L"]
                      R: Shift.Base<S["R"]["unscanned"], Dict>
                  }>,
                  S["R"]["lookahead"]
              >
            : ParserType.ParseFinalizing<S>

        type ParseRightBound<
            S extends ParserType.State,
            T extends Token
        > = S["R"]["lookahead"] extends NumberLiteralDefinition
            ? ParserType.ParseFinalizing<ParseRight<S, T, S["R"]["lookahead"]>>
            : ParserType.ErrorState<
                  S,
                  `Right bound ${S["R"]["lookahead"]} must be a number literal followed only by other suffixes.`
              >

        export type ParsePossibleLeftBound<
            S extends ParserType.State,
            N extends NumberLiteralDefinition,
            Dict
        > = S["R"]["lookahead"] extends Token
            ? ParserType.ParseMain<
                  ParseLeft<S, S["R"]["lookahead"], N, Dict>,
                  Dict
              >
            : ParserType.ParseMain<
                  ParserType.StateFrom<{
                      L: ParserType.SetExpression<S["L"], N>
                      R: S["R"]
                  }>,
                  Dict
              >
    }

    export interface Boundable extends Base.Node {
        boundBy?: string
        toBound(value: unknown): number
    }

    export const isBoundable = (node: Base.Node): node is Boundable =>
        "toBound" in node

    export type BoundEntry = Entry<T.Token, number>

    export class Node extends NonTerminal<Boundable> {
        private bounds: BoundEntry[] | undefined

        toString() {
            return "Bounds not impelmented.."
        }

        assertBoundable(
            node: Base.Node | Boundable
        ): asserts node is Boundable {
            if (isBoundable(node)) {
                return
            }
            throw new Error(unboundableError(node.toString()))
        }

        // TODO: Remove this once bounds are converted over
        // eslint-disable-next-line max-lines-per-function
        allows(args: Base.Validation.Args) {
            const boundedNode = this.children
            if (!boundedNode.allows(args)) {
                return false
            }
            const boundedValue = boundedNode.toBound(args.value)
            for (const [comparator, bound] of this.bounds!) {
                const boundDescription = `${bound}${
                    boundedNode.boundBy ? " " + boundedNode.boundBy : ""
                }`
                if (comparator === "<=" && boundedValue > bound) {
                    return this.addBoundError(
                        "less than or equal to",
                        boundedValue,
                        boundDescription,
                        args
                    )
                } else if (comparator === ">=" && boundedValue < bound) {
                    return this.addBoundError(
                        "greater than or equal to",
                        boundedValue,
                        boundDescription,
                        args
                    )
                } else if (comparator === "<" && boundedValue >= bound) {
                    return this.addBoundError(
                        "less than",
                        boundedValue,
                        boundDescription,
                        args
                    )
                } else if (comparator === ">" && boundedValue <= bound) {
                    return this.addBoundError(
                        "greater than",
                        boundedValue,
                        boundDescription,
                        args
                    )
                } else if (comparator === "==" && boundedValue !== bound) {
                    return this.addBoundError(
                        // Error message is cleaner without token name for equality check
                        "",
                        boundedValue,
                        boundDescription,
                        args
                    )
                }
            }
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
}
