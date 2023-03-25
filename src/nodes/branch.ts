import { writeImplicitNeverMessage } from "../parse/ast/intersection.ts"
import type { Morph } from "../parse/ast/morph.ts"
import type { Domain, inferDomain } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type { constructor, evaluate } from "../utils/generics.ts"
import type { Compilation } from "./compile.ts"
import type { Comparison, ComparisonState } from "./compose.ts"
import type { NarrowNode } from "./rules/narrow.ts"
import type { PropsRule } from "./rules/props.ts"
import type { Range } from "./rules/range.ts"
import type { RuleNode } from "./rules/rule.ts"

export class BranchNode<domain extends Domain = Domain> {
    public domain: domain
    public value: unknown
    public rules: RuleNode[]
    public morphs: Morph[]

    constructor(public definition: RuleSet<domain>) {}

    get hasMorphs() {
        return this.morphs.length !== 0
    }

    compare(
        branch: BranchNode,
        s: ComparisonState
    ): Comparison<RuleSet<domain>> {
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
        const result: Comparison<RuleSet> = {
            intersection: {
                domain: this.domain
            },
            isSubtype: morphAssignable,
            isSupertype: morphAssignable,
            isDisjoint: false
        }
        let i = 0
        for (let j = 0; j < branch.rules.length; j++) {
            while (this.rules[i].precedence < branch.rules[j].precedence) {
                result.intersection.push(this.rules[i])
                result.isSubtype = false
                i++
            }
            if (this.rules[i].precedence === this.rules[j].precedence) {
                const subresult = this.rules[i].compare(this.rules[j], s)
                if (subresult.isDisjoint) {
                    return subresult
                }
                result.isSubtype &&= subresult.isSubtype
                result.isSupertype &&= subresult.isSupertype
                i++
            } else {
                result.intersection.push(branch.rules[j])
            }
        }
        while (i < this.rules.length) {
            result.intersection.push(this.rules[i])
        }
        return result
    }

    allows(value: unknown) {
        return true
    }

    compile(c: Compilation) {
        return this.domain === "object"
            ? `(typeof ${c.data} === "object" && ${c.data} !== null) || typeof ${c.data} === "function"`
            : this.domain === "null" || this.domain === "undefined"
            ? `${c.data} === ${this.domain}`
            : `typeof ${c.data} === "${this.domain}"`
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

export type RuleSet<domain extends Domain = Domain> = Domain extends domain
    ? evaluate<UniversalRules<domain> & CustomRules>
    : RulesByDomain[domain]

// TODO: evaluate not working?
type RulesByDomain = {
    object: defineCustomRules<"object", "props" | "range" | "instance">
    string: defineCustomRules<"string", "regex" | "range">
    number: defineCustomRules<"number", "divisor" | "range">
    boolean: UniversalRules<"boolean">
    bigint: UniversalRules<"bigint">
    symbol: UniversalRules<"symbol">
    undefined: UniversalRules<"undefined">
    null: UniversalRules<"null">
}

type defineCustomRules<
    domain extends Domain,
    ruleKeys extends keyof CustomRules
> = evaluate<UniversalRules<domain> & Pick<CustomRules, ruleKeys>>

type CustomRules = {
    readonly regex?: string[]
    readonly divisor?: number
    readonly range?: Range
    readonly props?: PropsRule
    readonly instance?: constructor
}

type UniversalRules<domain extends Domain> = {
    readonly domain: domain
    readonly value?: inferDomain<domain>
    readonly narrow?: NarrowNode
    readonly morphs?: Morph[]
}
