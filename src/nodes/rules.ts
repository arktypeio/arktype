import type { Filter } from "../parse/ast/filter.ts"
import type { Morph } from "../parse/ast/morph.ts"
import type { constructor, instanceOf } from "../utils/generics.ts"
import type {
    ComparisonState,
    CompilationState,
    nodeDefinition
} from "./node.ts"
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

export class Rules extends Node<typeof Rules> {
    constructor(definition: RulesDefinition) {
        super(Rules, definition)
        // const rules = {} as mutable<RuleNodes>
        // let kind: RuleKind
        // for (kind in definition as RuleDefinitions) {
        //     rules[kind] = createRuleNode(kind, definition) as any
        // }
    }

    static createChildren(def: RulesDefinition) {
        const children: RulesChildren = {}
        let kind: RuleKind
        for (kind in def) {
            children[kind] = createRule(kind, def[kind as never]) as any
        }
        return children
    }

    static compile(rules: RulesChildren, s: CompilationState) {
        return s.data ? `${rules}` : ""
    }

    static intersect(l: Rules, r: Rules, s: ComparisonState) {
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

type RuleNodeKinds = typeof ruleNodeKinds

type RuleKind = keyof RuleNodeKinds

const createRule = <kind extends RuleKind>(
    kind: kind,
    def: nodeDefinition<RuleNodeKinds[kind]>
) => new ruleNodeKinds[kind](def as never) as instanceOf<RuleNodeKinds[kind]>

// type inferRuleSet<rules extends RulesDefinition> = rules extends Constraints
//     ? inferDomain<rules["domain"]>
//     : rules extends ExactValue<infer value>
//     ? value
//     : never

type ruleBranch<rules extends RulesDefinition> =
    rules extends ConstraintsDefinition
        ? ConstraintsDefinition & { domain: rules["domain"] }
        : ExactValueDefinition

export type validateRules<rules extends RulesDefinition> = {
    [k in keyof rules]: k extends keyof ruleBranch<rules> ? rules[k] : never
}

export type RulesDefinition = ExactValueDefinition | ConstraintsDefinition

type UnknownRulesDefinition = {
    [k in RuleKind]: nodeDefinition<RuleNodeKinds[k]>
}

type ExactValueDefinition<value = unknown> = {
    value: value
    morphs?: Morph[]
}

type ConstraintsDefinition = {
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

export type RulesChildren = {
    [k in RuleKind]?: RuleNodeKinds[k] extends constructor<infer node>
        ? node
        : never
}
