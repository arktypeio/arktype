import type { Filter } from "../parse/ast/filter.ts"
import type { Morph } from "../parse/ast/morph.ts"
import type { constructor } from "../utils/generics.ts"
import type { ComparisonState, CompilationState } from "./node.ts"
import { Node } from "./node.ts"
import { DivisibilityNode } from "./rules/divisibility.ts"
import { DomainNode } from "./rules/domain.ts"
import { EqualityNode } from "./rules/equality.ts"
import { FilterNode } from "./rules/filter.ts"
import { InstanceNode } from "./rules/instance.ts"
import { MorphNode } from "./rules/morph.ts"
import { PropsNode } from "./rules/props.ts"
import type { Bounds } from "./rules/range.ts"
import { RangeNode } from "./rules/range.ts"
import { RegexNode } from "./rules/regex.ts"

export class Branch extends Node<typeof Branch> {
    constructor(public rules: RuleNodes) {
        super(Branch, rules)
        // const rules = {} as mutable<RuleNodes>
        // let kind: RuleKind
        // for (kind in definition as RuleDefinitions) {
        //     rules[kind] = createRuleNode(kind, definition) as any
        // }
    }

    static compile(rules: RuleNodes, s: CompilationState) {
        return s.data ? `${rules.range}` : ""
    }

    static intersect(l: Branch, r: Branch, s: ComparisonState) {
        // if (
        //     // TODO: Fix
        //     // s.lastOperator === "&" &&
        //     this.rules.morphs?.some(
        //         (morph, i) => morph !== branch.tree.morphs?.[i]
        //     )
        // ) {
        //     throwParseError(
        //         writeImplicitNeverMessage(s.path, "Intersection", "of morphs")
        //     )
        // }
        return s.path ? l : r
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

export const ruleNodeKinds = {
    domain: DomainNode,
    value: EqualityNode,
    instance: InstanceNode,
    range: RangeNode,
    divisor: DivisibilityNode,
    regex: RegexNode,
    props: PropsNode,
    filters: FilterNode,
    morphs: MorphNode
} as const

// type inferRuleSet<rules extends RulesDefinition> = rules extends Constraints
//     ? inferDomain<rules["domain"]>
//     : rules extends ExactValue<infer value>
//     ? value
//     : never

type ruleBranch<rules extends RulesDefinition> = rules extends Constraints
    ? Constraints & { domain: rules["domain"] }
    : ExactValue

export type validateRules<rules extends RulesDefinition> = {
    [k in keyof rules]: k extends keyof ruleBranch<rules> ? rules[k] : never
}

export type RulesDefinition = ExactValue | Constraints

type ExactValue<value = unknown> = {
    value: value
    morphs?: Morph[]
}

type Constraints = {
    filters?: Filter[]
    morphs?: Morph[]
} & (
    | {
          domain: "object"
          instance?: constructor
          props?: ""
      }
    | {
          domain: "object"
          instance: Array<any>
          props?: ""
          range?: Bounds
      }
    | {
          domain: "string"
          regex?: string[]
          range?: Bounds
      }
    | {
          domain: "number"
          divisor?: number
          range?: Bounds
      }
    | { domain: "bigint" }
    | { domain: "symbol" }
)

type RuleNodeKinds = typeof ruleNodeKinds

type RuleKind = keyof RuleNodeKinds

export type RuleNodes = {
    [k in RuleKind]?: RuleNodeKinds[k] extends constructor<infer node>
        ? node
        : never
}
