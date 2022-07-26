import { Entry } from "@re-/tools"
import { Base } from "../../base/index.js"
import { Str } from "../str.js"
import { NumberLiteral } from "./literal.js"

type ComparatorToken = "<=" | ">=" | "<" | ">" | "=="

const invalidBoundError = (bound: string) =>
    `Bounding value '${Base.defToString(bound)}' must be a number literal.`

const unboundableError = (inner: string) =>
    `Definition '${Base.defToString(inner)}' is not boundable.`

const boundPartsErrorTemplate =
    "Bounds must be either of the form D<N or N<D<N, where 'D' is a boundable definition, 'N' is a number literal, and '<' is a comparison token."

const invertComparator = (token: ComparatorToken): ComparatorToken => {
    switch (token) {
        case "<=":
            return ">="
        case ">=":
            return "<="
        case "<":
            return ">"
        case ">":
            return "<"
        case "==":
            return "=="
    }
}

export namespace Bound {
    export type Definition = `${string}${ComparatorToken}${string}`

    export interface Boundable extends Base.Node {
        boundBy?: string
        toBound(value: unknown): number
    }

    export const isBoundable = (node: Base.Node): node is Boundable =>
        "toBound" in node

    const matcher = /(<=|>=|<|>|==)/

    export const matches = (def: string): def is Definition => matcher.test(def)

    const valueFromBoundPart = (part: string) => {
        if (!NumberLiteral.matches(part)) {
            throw new Error(invalidBoundError(part))
        }
        return NumberLiteral.valueFrom(part)
    }

    export type BoundEntry = Entry<ComparatorToken, number>

    type BoundParts = [string, ComparatorToken, string]
    type RangeParts = [string, ComparatorToken, string, ComparatorToken, string]

    export class Node extends Base.NonTerminal<Boundable> {
        private bounds: BoundEntry[] | undefined

        toString() {
            return "Bounds not impelmented.."
        }

        // E.g. ["number", ">=", "5"]
        private parseBound(parts: BoundParts) {
            this.bounds = [[parts[1], valueFromBoundPart(parts[2])]]
            return Str.parse(parts[0], this.ctx)
        }

        // E.g. ["5", "<", "string", "<=", "20"]
        private parseRange(parts: RangeParts) {
            /** We have to invert the first comparator in an expression like
             * 5<=number<10
             * so that it can be split into two expressions like
             * number>=5
             * number<10
             */
            this.bounds = [
                [invertComparator(parts[1]), valueFromBoundPart(parts[0])],
                [parts[3], valueFromBoundPart(parts[4])]
            ]
            return Str.parse(parts[2], this.ctx)
        }

        assertBoundable(
            node: Base.Node | Boundable
        ): asserts node is Boundable {
            if (isBoundable(node)) {
                return
            }
            throw new Error(unboundableError(node.toString()))
        }

        private addBoundErrorAndReturnFalse(
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
                    return this.addBoundErrorAndReturnFalse(
                        "less than or equal to",
                        boundedValue,
                        boundDescription,
                        args
                    )
                } else if (comparator === ">=" && boundedValue < bound) {
                    return this.addBoundErrorAndReturnFalse(
                        "greater than or equal to",
                        boundedValue,
                        boundDescription,
                        args
                    )
                } else if (comparator === "<" && boundedValue >= bound) {
                    return this.addBoundErrorAndReturnFalse(
                        "less than",
                        boundedValue,
                        boundDescription,
                        args
                    )
                } else if (comparator === ">" && boundedValue <= bound) {
                    return this.addBoundErrorAndReturnFalse(
                        "greater than",
                        boundedValue,
                        boundDescription,
                        args
                    )
                } else if (comparator === "==" && boundedValue !== bound) {
                    return this.addBoundErrorAndReturnFalse(
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
    }
}
