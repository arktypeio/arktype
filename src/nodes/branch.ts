import { writeImplicitNeverMessage } from "../parse/ast/intersection.ts"
import type { Morph } from "../parse/ast/morph.ts"
import { chainableNoOpProxy } from "../utils/chainableNoOpProxy.ts"
import type { Domain, inferDomain } from "../utils/domains.ts"
import { domainOf } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type { constructor, evaluate } from "../utils/generics.ts"
import { mutable } from "../utils/generics.ts"
import type { ComparisonState, Compilation } from "./node.ts"
import { Node } from "./node.ts"
import type { NarrowRule } from "./rules/narrow.ts"
import type { PropsRule } from "./rules/props.ts"
import type { Bounds } from "./rules/range.ts"

export class BranchNode<rules extends RuleSet = any> extends Node<BranchNode> {
    constructor(public rules: rules) {
        super("TODO")
    }

    get infer(): inferDomain<this["rules"]["domain"]> {
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
        return this.rules.domain === "object"
            ? `(typeof ${c.data} === "object" && ${c.data} !== null) || typeof ${c.data} === "function"`
            : this.rules.domain === "null" || this.rules.domain === "undefined"
            ? `${c.data} === ${this.rules.domain}`
            : `typeof ${c.data} === "${this.rules.domain}"`
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

export class ValueNode<
    value = unknown,
    morphs extends Morph[] | undefined = undefined
> extends BranchNode<{
    value: value
    domain: domainOf<value>
}> {
    constructor(public value: value, morphs?: Morph[]) {
        const rules = {} as RuleSet<domainOf<value>>
        if (morphs) {
            mutable(rules).morphs = morphs
        }
        super({
            domain: domainOf(value),
            value
        })
    }
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
    readonly range?: Bounds
    readonly props?: PropsRule
    readonly instance?: constructor
}

type UniversalRules<domain extends Domain> = {
    readonly domain: domain
    readonly value?: inferDomain<domain>
    readonly narrow?: NarrowRule
    readonly morphs?: Morph[]
}
