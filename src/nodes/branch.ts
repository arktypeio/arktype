import { writeImplicitNeverMessage } from "../parse/ast/intersection.ts"
import type { Morph } from "../parse/ast/morph.ts"
import type { Narrow } from "../parse/ast/narrow.ts"
import type { Domain, inferDomain } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type { constructor, evaluate, mutable } from "../utils/generics.ts"
import type { Compilation } from "./compile.ts"
import type { IntersectionResult, IntersectionState } from "./compose.ts"
import { compileDivisor } from "./rules/divisor.ts"
import { compileInstance } from "./rules/instance.ts"
import type { PropsRule } from "./rules/props.ts"
import { compileProps } from "./rules/props.ts"
import type { Range } from "./rules/range.ts"
import { compileRange } from "./rules/range.ts"
import { compileRegex } from "./rules/regex.ts"
import { compileValueCheck } from "./rules/value.ts"

type RuleSetIntersection = Extract<
    IntersectionResult<mutable<RuleSet>>,
    {
        isDisjoint: false
    }
>

export abstract class BranchNode<domain extends Domain = Domain> {
    constructor(public rules: RuleSet<domain>) {}

    intersect(
        r: BranchNode,
        s: IntersectionState
    ): IntersectionResult<BranchNode> {
        if (this.rules.domain !== r.rules.domain) {
            return s.disjoint("domain", this.rules.domain, r.rules.domain)
        }
        const intersection: RuleSetIntersection = {
            result: {
                domain: this.rules.domain
            },
            isSubtype: true,
            isSupertype: true,
            isDisjoint: false
        }
        this.#addMorphIntersectionIfPresent(intersection, r, s)
        this.#addValueIntersectionIfPresent(intersection, r, s)
        return s.equality(this as unknown as BranchNode)
    }

    #addMorphIntersectionIfPresent(
        intersection: RuleSetIntersection,
        r: BranchNode,
        s: IntersectionState
    ) {
        if (this.rules.morph) {
            if (r.rules.morph) {
                if (this.rules.morph === r.rules.morph) {
                    intersection.result.morph = this.rules.morph
                } else if (s.lastOperator === "&") {
                    throwParseError(
                        writeImplicitNeverMessage(
                            s.path,
                            "Intersection",
                            "of morphs"
                        )
                    )
                }
                return
            }
            intersection.result.morph = this.rules.morph
        } else if (r.rules.morph) {
            intersection.result.morph = r.rules.morph
        } else {
            return
        }
        // an intersection between a morph type and a non-morph type precludes
        // assignability in either direction.
        intersection.isSubtype = false
        intersection.isSupertype = false
    }

    #addValueIntersectionIfPresent(
        intersection: RuleSetIntersection,
        r: BranchNode,
        s: IntersectionState
    ) {
        if ("value" in this.rules) {
            if ("value" in r.rules) {
                if (this.rules.value === r.rules.value) {
                    intersection.result.value = this.rules.value
                } else {
                    return s.disjoint("value", this.rules.value, r.rules.value)
                }
            }
            if (r.allows(this.rules.value)) {
                intersection.result.value = this.rules.value
                intersection.isSupertype = false
            } else {
                return s.disjoint(
                    "leftAssignability",
                    this.rules.value,
                    r.rules
                )
            }
        }
        if ("value" in r.rules) {
            if (this.allows(r.rules.value)) {
                intersection.result.value = r.rules.value
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

    allows(value: unknown) {
        return true
    }

    compile(c: Compilation): string {
        let result = ""
        if (this.rules.value) {
            result += compileValueCheck(this.rules.value, c)
        }
        if (this.rules.instance) {
            result += compileInstance(this.rules.instance, c)
        }

        const shallowChecks: string[] = []

        if (this.rules.divisor) {
            shallowChecks.push(compileDivisor(this.rules.divisor, c))
        }
        if (this.rules.range) {
            shallowChecks.push(compileRange(this.rules.range, c))
        }
        if (this.rules.regex) {
            shallowChecks.push(compileRegex(this.rules.regex, c))
        }

        if (shallowChecks.length) {
            result += " && " + c.mergeChecks(shallowChecks)
        }

        if (this.rules.props) {
            result += " && "
            result += compileProps(this.rules.props, c)
        }

        if (this.rules.narrow) {
        }
        return result
    }
}

export type RuleSet<domain extends Domain = Domain> = Domain extends domain
    ? evaluate<UniversalRules<Domain> & NonNullishRules<Domain> & CustomRules>
    : RuleSetsByDomain[domain]

// TODO: evaluate not working?
type RuleSetsByDomain = {
    object: defineCustomRules<"object", "props" | "range" | "instance">
    string: defineCustomRules<"string", "regex" | "range">
    number: defineCustomRules<"number", "divisor" | "range">
    boolean: defineNonNullishRules<"boolean">
    bigint: defineNonNullishRules<"bigint">
    symbol: defineNonNullishRules<"symbol">
    undefined: UniversalRules<"undefined">
    null: UniversalRules<"null">
}

type defineCustomRules<
    domain extends Domain,
    ruleKeys extends keyof CustomRules
> = evaluate<
    UniversalRules<domain> &
        NonNullishRules<domain> &
        Pick<CustomRules, ruleKeys>
>

type defineNonNullishRules<domain extends Domain> = evaluate<
    UniversalRules<domain> & NonNullishRules<domain>
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
    readonly narrow?: Narrow[]
}

type UniversalRules<domain extends Domain> = {
    readonly domain: domain
    readonly morph?: Morph[]
}
