import { throwInternalError } from "../../utils/errors.ts"
import type { xor } from "../../utils/generics.ts"
import type { Compilation } from "../compile.ts"
import type { ComparisonState } from "../compose.ts"
import { RuleNode } from "./rule.ts"

export type Range = xor<
    { "==": number },
    LowerBoundComparators & UpperBoundComparators
>

type LowerBoundComparators = xor<{ ">"?: number }, { ">="?: number }>

type Bound = {
    limit: number
    exclusive: boolean
}

type UpperBoundComparators = xor<{ "<"?: number }, { "<="?: number }>

export const minComparators = {
    ">": true,
    ">=": true
} as const

export type MinComparator = keyof typeof minComparators

export const maxComparators = {
    "<": true,
    "<=": true
} as const

export type MaxComparator = keyof typeof maxComparators

export class RangeNode extends RuleNode<"range"> {
    constructor(public comparators: Range) {
        super(
            "range",
            // TODO: sort
            JSON.stringify(comparators)
        )
    }

    isEqualityRange(): this is { comparators: { "==": number } } {
        return this.comparators["=="] !== undefined
    }

    comparatorToBound(
        comparator: MinComparator | MaxComparator
    ): Bound | undefined {
        if (this.comparators[comparator] !== undefined) {
            return {
                limit: this.comparators[comparator]!,
                exclusive: true
            }
        }
    }

    get lowerBound() {
        return this.comparatorToBound(">") ?? this.comparatorToBound(">=")
    }

    #extractComparators(prefix: ">" | "<") {
        return this.comparators[prefix] !== undefined
            ? { [prefix]: this.comparators[">"] }
            : this.comparators[`${prefix}=`] !== undefined
            ? { [`${prefix}=`]: this.comparators[`${prefix}=`] }
            : {}
    }

    get upperBound() {
        return this.comparatorToBound("<") ?? this.comparatorToBound("<=")
    }

    allows(size: number) {
        return true
    }

    intersect(other: RangeNode, s: ComparisonState) {
        if (this.isEqualityRange()) {
            if (other.isEqualityRange()) {
                return this.comparators["=="] === other.comparators["=="]
                    ? this
                    : s.addDisjoint(
                          "range",
                          this.comparators,
                          other.comparators
                      )
            }
            return other.allows(this.comparators["=="])
                ? this
                : s.addDisjoint("range", this.comparators, other.comparators)
        }
        if (other.isEqualityRange()) {
            return this.allows(other.comparators["=="])
                ? other
                : s.addDisjoint("range", this.comparators, other.comparators)
        }
        const stricterMin = compareStrictness(
            "min",
            this.lowerBound,
            other.lowerBound
        )
        const stricterMax = compareStrictness(
            "max",
            this.upperBound,
            other.upperBound
        )
        if (stricterMin === "l") {
            if (stricterMax === "r") {
                return compareStrictness(
                    "min",
                    this.lowerBound,
                    other.upperBound
                ) === "l"
                    ? s.addDisjoint(
                          "range",
                          this.comparators,
                          other.comparators
                      )
                    : new RangeNode({
                          ...this.#extractComparators(">"),
                          ...other.#extractComparators("<")
                      })
            }
            return this
        }
        if (stricterMin === "r") {
            if (stricterMax === "l") {
                return compareStrictness(
                    "max",
                    this.upperBound,
                    other.lowerBound
                ) === "l"
                    ? s.addDisjoint(
                          "range",
                          this.comparators,
                          other.comparators
                      )
                    : new RangeNode({
                          ...other.#extractComparators(">"),
                          ...this.#extractComparators("<")
                      })
            }
            return other
        }
        return stricterMax === "l" ? this : other
    }

    compile(c: Compilation): string {
        const compileRange = (range: Range, c: Compilation) =>
            isEqualityRange(range)
                ? compileBounds(c, range)
                : range.min
                ? range.max
                    ? compileBounds(c, range.min, range.max)
                    : compileBounds(c, range.min)
                : compileBounds(c, range.max)

        const compileSizeAssignment = (data: string) =>
            `const size = typeof ${data} === "number" ? ${data} : ${data}.length;` as const

        const compileBounds = (c: Compilation, ...bounds: Bound[]) => {
            const units =
                c.lastDomain === "string"
                    ? "characters"
                    : c.lastDomain === "object"
                    ? "items long"
                    : c.lastDomain === "number"
                    ? ""
                    : throwInternalError(
                          `Unexpected lastDomain '${c.lastDomain}' while compiling range.`
                      )
            return `${compileSizeAssignment(c.data)}${compileBoundCheck(
                { ...bounds[0], units },
                c
            )}${
                bounds.length === 2
                    ? ` && ${compileBoundCheck({ ...bounds[1], units }, c)}`
                    : ""
            }` as const
        }

        const compileBoundCheck = (bound: BoundWithUnits, c: Compilation) =>
            c.check("range", `size ${bound.comparator} ${bound.limit}`, bound)
    }
}

export const compareStrictness = (
    kind: "min" | "max",
    l: Bound | undefined,
    r: Bound | undefined
) =>
    !l
        ? !r
            ? "="
            : "r"
        : !r
        ? "l"
        : l.limit === r.limit
        ? l.exclusive
            ? r.exclusive
                ? "="
                : "l"
            : r.exclusive
            ? "r"
            : "="
        : kind === "min"
        ? l.limit > r.limit
            ? "l"
            : "r"
        : l.limit < r.limit
        ? "l"
        : "r"
