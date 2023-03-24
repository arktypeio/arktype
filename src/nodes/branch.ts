import { writeImplicitNeverMessage } from "../parse/ast/intersection.ts"
import type { Morph } from "../parse/ast/morph.ts"
import type { Domain, inferDomain } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type { constructor, evaluate, mutable } from "../utils/generics.ts"
import type { Comparison, ComparisonState } from "./compose.ts"
import type { DomainNode } from "./rules/domain.ts"
import type { NarrowNode } from "./rules/narrow.ts"
import type { PropsRule } from "./rules/props.ts"
import type { Range } from "./rules/range.ts"
import type { RuleNode } from "./rules/rule.ts"

type RuleSetComparison = Extract<
    Comparison<mutable<RuleSet>>,
    {
        isDisjoint: false
    }
>

export abstract class BranchNode<domain extends Domain = Domain> {
    constructor(
        public domain: domain,
        // TODO: add domain constraint
        public rules: RuleNode[],
        public morphs: Morph[]
    ) {}

    get hasMorphs() {
        return this.morphs.length !== 0
    }

    intersect(branch: BranchNode, s: ComparisonState): Comparison<BranchNode> {
        if (this.domain !== branch.domain) {
            return s.disjoint("domain", this.domain, branch.domain)
        }
        if (
            s.lastOperator === "&" &&
            this.morphs.some((morph, i) => morph !== branch.morphs[i])
        ) {
            throwParseError(
                writeImplicitNeverMessage(s.path, "Intersection", "of morphs")
            )
        }
        // an intersection between a morph type and a non-morph type precludes
        // assignability in either direction.
        const morphAssignable = this.hasMorphs === branch.hasMorphs
        const result: Comparison<RuleNode[]> = {
            intersection: [],
            isSubtype: morphAssignable,
            isSupertype: morphAssignable,
            isDisjoint: false
        }

        let i = 0
        for (let j = 0; j < branch.rules.length; j++) {
            while (this.rules[i].precedence < branch.rules[j].precedence) {
                result.intersection.push(this.rules[i])
                result.isSubtype = false
            }
            if (this.rules[i].precedence === this.rules[j].precedence) {
                const subresult = this.rules[i].compare(this.rules[j], s)
            }
        }
        return s.equality(this as unknown as BranchNode)
    }

    allows(value: unknown) {
        return true
    }

    // compile(c: Compilation): string {
    //     let result = ""
    //     if (this.rules.value) {
    //         result += compileValueCheck(this.rules.value, c)
    //     }
    //     if (this.rules.instance) {
    //         result += compileInstance(this.rules.instance, c)
    //     }

    //     const shallowChecks: string[] = []

    //     if (this.rules.divisor) {
    //         shallowChecks.push(compileDivisor(this.rules.divisor, c))
    //     }
    //     if (this.rules.range) {
    //         shallowChecks.push(compileRange(this.rules.range, c))
    //     }
    //     if (this.rules.regex) {
    //         shallowChecks.push(compileRegex(this.rules.regex, c))
    //     }

    //     if (shallowChecks.length) {
    //         result += " && " + c.mergeChecks(shallowChecks)
    //     }

    //     if (this.rules.props) {
    //         result += " && "
    //         result += compileProps(this.rules.props, c)
    //     }

    //     if (this.rules.narrow) {
    //     }
    //     return result
    // }
}

type NonNullishDomain = Exclude<Domain, "null" | "undefined">

export class NonNullishBranchNode<
    domain extends NonNullishDomain = NonNullishDomain
> extends BranchNode<domain> {
    addIntersections(
        intersection: RuleSetComparison,
        r: BranchNode,
        s: ComparisonState
    ) {
        this.#addValueIntersectionIfPresent(intersection, r, s)
    }

    #addValueIntersectionIfPresent(
        intersection: RuleSetComparison,
        r: BranchNode,
        s: ComparisonState
    ) {
        if (this.rules.value !== undefined) {
            if (r.rules.value !== undefined) {
                if (this.rules.value === r.rules.value) {
                    intersection.intersection.value = this.rules.value
                } else {
                    return s.disjoint("value", this.rules.value, r.rules.value)
                }
            }
            if (r.allows(this.rules.value)) {
                intersection.intersection.value = this.rules.value
                intersection.isSupertype = false
            } else {
                return s.disjoint(
                    "leftAssignability",
                    this.rules.value,
                    r.rules
                )
            }
        }
        if (r.rules.value !== undefined) {
            if (this.allows(r.rules.value)) {
                intersection.intersection.value = r.rules.value
                intersection.isSubtype = false
            } else {
                return s.disjoint(
                    "rightAssignability",
                    this.rules,
                    r.rules.value
                )
            }
        }
    }

    #addNarrowIntersectionIfPresent(
        intersection: RuleSetComparison,
        r: BranchNode,
        s: ComparisonState
    ) {
        if (this.rules.narrow) {
            if (r.rules.narrow) {
                intersection.intersection.narrow = this.rules.narrow
            }
        }
    }
}

export type RuleSet<domain extends Domain = Domain> = Domain extends domain
    ? evaluate<UniversalRules & NonNullishRules<Domain> & CustomRules>
    : RulesByDomain[domain]

// TODO: evaluate not working?
type RulesByDomain = {
    object: defineCustomRules<"object", "props" | "range" | "instance">
    string: defineCustomRules<"string", "regex" | "range">
    number: defineCustomRules<"number", "divisor" | "range">
    boolean: defineNonNullishRules<"boolean">
    bigint: defineNonNullishRules<"bigint">
    symbol: defineNonNullishRules<"symbol">
    undefined: UniversalRules
    null: UniversalRules
}

type defineCustomRules<
    domain extends Domain,
    ruleKeys extends keyof CustomRules
> = evaluate<
    UniversalRules & NonNullishRules<domain> & Pick<CustomRules, ruleKeys>
>

type defineNonNullishRules<domain extends Domain> = evaluate<
    UniversalRules & NonNullishRules<domain>
>

type CustomRules = {
    readonly regex?: string[]
    readonly divisor?: number
    readonly range?: Range
    readonly props?: PropsRule
    readonly instance?: constructor
}

type NonNullishRules<domain extends Domain> = {
    readonly value?: inferDomain<domain>
    readonly narrow?: NarrowNode
}

type UniversalRules = {
    readonly domain: DomainNode
    readonly morph?: Morph[]
}
