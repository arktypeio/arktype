import { writeImplicitNeverMessage } from "../parse/ast/intersection.ts"
import type { Morph } from "../parse/ast/morph.ts"
import { chainableNoOpProxy } from "../utils/chainableNoOpProxy.ts"
import type { Domain, inferDomain } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type { evaluate } from "../utils/generics.ts"
import type { ComparisonState, Compilation } from "./node.ts"
import { Node } from "./node.ts"
import type { DivisibilityRule } from "./rules/divisibility.ts"
import type { DomainRule } from "./rules/domain.ts"
import type { EqualityRule } from "./rules/equality.ts"
import type { InstanceRule } from "./rules/instance.ts"
import type { NarrowRule } from "./rules/narrow.ts"
import type { PropsRule } from "./rules/props.ts"
import type { RangeRule } from "./rules/range.ts"
import type { RegexRule } from "./rules/regex.ts"

export class BranchNode<
    rules extends RuleSet<domain> = any,
    domain extends Domain = any
> extends Node<BranchNode> {
    constructor(public rules: rules) {
        super("TODO")
    }

    get infer(): inferDomain<this["rules"]["domain"]["domain"]> {
        return chainableNoOpProxy
    }

    get hasMorphs() {
        return this.rules.morphs
    }

    intersect(branch: BranchNode, s: ComparisonState) {
        if (this.rules.domain !== branch.rules.domain) {
            return s.addDisjoint(
                "domain",
                this.rules.domain,
                branch.rules.domain
            )
        }
        if (
            // TODO: Fix
            // s.lastOperator === "&" &&
            this.rules.morphs?.some(
                (morph, i) => morph !== branch.rules.morphs?.[i]
            )
        ) {
            throwParseError(
                writeImplicitNeverMessage(s.path, "Intersection", "of morphs")
            )
        }
        return this
    }

    allows() {
        return true
    }

    compile(c: Compilation) {
        return ""
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
    readonly regex?: RegexRule
    readonly divisor?: DivisibilityRule
    readonly range?: RangeRule
    readonly props?: PropsRule
    readonly instance?: InstanceRule
}

type UniversalRules<domain extends Domain> = {
    readonly domain: DomainRule<domain>
    readonly value?: EqualityRule<domain>
    readonly narrow?: NarrowRule<domain>
    readonly morphs?: Morph<domain>[]
}
