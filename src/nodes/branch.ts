import { writeImplicitNeverMessage } from "../parse/ast/intersection.ts"
import { chainableNoOpProxy } from "../utils/chainableNoOpProxy.ts"
import type { Domain, inferDomain } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type { constructor, evaluate, mutable } from "../utils/generics.ts"
import type { ComparisonState, Compilation } from "./node.ts"
import { Node } from "./node.ts"
import { DivisibilityNode } from "./rules/divisibility.ts"
import { DomainNode } from "./rules/domain.ts"
import { EqualityNode } from "./rules/equality.ts"
import { InstanceNode } from "./rules/instance.ts"
import { MorphNode } from "./rules/morph.ts"
import { NarrowNode } from "./rules/narrow.ts"
import { PropsNode } from "./rules/props.ts"
import { RangeNode } from "./rules/range.ts"
import { RegexNode } from "./rules/regex.ts"

export class BranchNode<
    definition extends RuleSet = RuleSet
> extends Node<BranchNode> {
    rules: RuleNodes

    constructor(public definition: definition) {
        super("TODO")
        const rules = {} as mutable<RuleNodes>
        let kind: RuleKind
        for (kind in definition as RuleSet) {
            rules[kind] = createRuleNode(kind, definition) as any
        }
        this.rules = rules
    }

    get infer(): inferDomain<this["definition"]["domain"]> {
        return chainableNoOpProxy
    }

    get hasMorphs() {
        return this.definition.morphs
    }

    intersect(branch: BranchNode, s: ComparisonState) {
        if (
            // TODO: Fix
            // s.lastOperator === "&" &&
            this.definition.morphs?.some(
                (morph, i) => morph !== branch.definition.morphs?.[i]
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

export type RuleSet<domain extends Domain = Domain> = {
    [k in keyof RuleNodes<domain>]: RuleNodes<domain>[k] extends
        | {
              definition: infer definition
          }
        | undefined
        ? definition
        : never
}

export type RuleNodes<domain extends Domain = Domain> = Domain extends domain
    ? evaluate<UniversalRules<domain> & CustomRules>
    : RulesByDomain[domain]

export type RuleKind = evaluate<keyof RuleNodes>

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
    readonly regex?: RegexNode
    readonly divisor?: DivisibilityNode
    readonly range?: RangeNode
    readonly props?: PropsNode
    readonly instance?: InstanceNode
}

type UniversalRules<domain extends Domain> = {
    readonly domain: DomainNode<domain>
    readonly value?: EqualityNode<domain>
    readonly narrow?: NarrowNode<domain>
    readonly morphs?: MorphNode
}

export const ruleNodeKinds = {
    domain: DomainNode,
    value: EqualityNode,
    instance: InstanceNode,
    range: RangeNode,
    divisor: DivisibilityNode,
    regex: RegexNode,
    props: PropsNode,
    narrow: NarrowNode,
    morphs: MorphNode
} as const satisfies Record<RuleKind, constructor<Node>>

const createRuleNode = <kind extends RuleKind>(
    kind: kind,
    def: RuleSet[kind]
) => new ruleNodeKinds[kind](def as never) as RuleNodes[kind]

export type RuleNodeKinds = typeof ruleNodeKinds
