import { writeImplicitNeverMessage } from "../parse/ast/intersection.ts"
import type { Morph } from "../parse/ast/morph.ts"
import type { Domain, inferDomain } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type { constructor, evaluate } from "../utils/generics.ts"
import type { Compilation } from "./compile.ts"
import { Intersection, IntersectionResult } from "./compose.ts"
import type { NarrowNode } from "./rules/narrow.ts"
import type { PropsRule } from "./rules/props.ts"
import type { Range } from "./rules/range.ts"

// TODO: subclasses for rules/value
export class BranchNode<domain extends Domain = Domain> {
    constructor(public domain: domain, public morphs: Morph[]) {}

    get hasMorphs() {
        return this.morphs.length !== 0
    }

    intersect(branch: BranchNode) {
        if (this.domain !== branch.domain) {
            return { kind: "domain", l: this.domain, r: branch.domain }
        }
        const s = new Intersection()
        if (
            // TODO: lastOperator?
            // s.lastOperator === "&" &&
            this.morphs.some((morph, i) => morph !== branch.morphs[i])
        ) {
            throwParseError(
                writeImplicitNeverMessage(s.path, "Intersection", "of morphs")
            )
        }
        if (this.hasMorphs !== branch.hasMorphs) {
            // an intersection between a morph type and a non-morph type precludes
            // assignability in either direction.
            s.isSubtype = false
            s.isSupertype = false
        }
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

export class ValueNode<
    domain extends Domain = Domain
> extends BranchNode<domain> {
    constructor(
        domain: domain,
        public value: inferDomain<domain>,
        morphs: Morph[] = []
    ) {
        super(domain, morphs)
    }
}

export class RulesNode<
    domain extends Domain = Domain
> extends BranchNode<domain> {
    constructor(
        domain: domain,
        public rules: RuleSet<domain>,
        morphs: Morph[] = []
    ) {
        super(domain, morphs)
    }

    intersect(
        branch: BranchNode,
        s: Intersection
    ): Intersection<RuleSet<domain>> {
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
