import { Keyword } from "../../operand/index.js"
import {
    Comparator,
    DoubleBoundComparator,
    invertedComparators,
    Node,
    NormalizedLowerBoundComparator,
    StrNode,
    strNode,
    unary
} from "./common.js"

export type BoundDefinition = [Comparator, number]

export type SingleBoundDefinition = [BoundDefinition]

export type DoubleBoundDefinition = [LowerBoundDefinition, UpperBoundDefinition]

export type LowerBoundDefinition = [NormalizedLowerBoundComparator, number]

export type UpperBoundDefinition = [DoubleBoundComparator, number]

export type BoundsDefinition = SingleBoundDefinition | DoubleBoundDefinition

export type Bound<
    Child = unknown,
    Bounds extends BoundsDefinition = BoundsDefinition
> = [Child, ...Bounds]

export class bound extends unary<boundableNode> {
    checkers: boundChecker[]

    constructor(
        child: boundableNode,
        private bounds: BoundsDefinition,
        ctx: Node.context
    ) {
        super(child, ctx)
        this.checkers = bounds.map((bound) => createBoundChecker(bound))
    }

    get tree(): Bound<StrNode> {
        return [this.child.tree, ...this.bounds]
    }

    override toString() {
        const rightBoundToString =
            this.bounds.length === 1
                ? this.bounds[0].join("")
                : this.bounds[1].join("")
        let result = this.child.toString() + rightBoundToString
        if (this.bounds.length === 2) {
            const leftBoundToString = `${this.bounds[0][1]}${
                invertedComparators[this.bounds[0][0]]
            }`
            result = leftBoundToString + result
        }
        return result
    }

    allows(args: Node.Allows.Args) {
        if (!this.child.allows(args)) {
            return false
        }
        const actual = this.child.toBound(args.value)
        let boundIndex = 0
        for (const checker of this.checkers) {
            if (!checker(actual)) {
                const error: boundValidationError = {
                    comparator: this.bounds[boundIndex][0],
                    limit: this.bounds[boundIndex][1],
                    actual,
                    source: args.value as BoundableValue
                }
                args.errors.add(args.ctx.path, error)
                return false
            }
            boundIndex++
        }
        return true
    }

    create() {
        throw new Node.Create.UngeneratableError(
            this.toString(),
            "Bound generation is unsupported."
        )
    }
}

export type boundChecker = (y: number) => boolean

export const createBoundChecker = ([token, x]: BoundDefinition) => {
    switch (token) {
        case "<=":
            return (y: number) => y <= x
        case ">=":
            return (y: number) => y >= x
        case "<":
            return (y: number) => y < x
        case ">":
            return (y: number) => y > x
        case "==":
            return (y: number) => y === x
        default:
            throw new Error(`Unexpected comparator ${token}.`)
    }
}

/** A BoundableNode must be either:
 *    1. A number-typed keyword terminal (e.g. "integer" in "integer>5")
 *    2. A string-typed keyword terminal (e.g. "alphanum" in "100<alphanum")
 *    3. Any list node (e.g. "(string|number)[]" in "(string|number)[]>0")
 */
export type BoundableNode =
    | Keyword.OfTypeNumber
    | Keyword.OfTypeString
    | [unknown, "[]"]

export interface boundableNode extends strNode {
    boundBy?: string
    toBound(value: unknown): number
}

export type BoundableValue = number | string | unknown[]

export const isBoundable = (node: strNode): node is boundableNode =>
    "toBound" in node

export type boundValidationError = Node.Allows.ErrorData<
    "BoundViolation",
    {
        comparator: Comparator
        limit: number
        size: number
        units?: "characters" | "items"
    }
>
