import { writeImplicitNeverMessage } from "../parse/ast/intersection.ts"
import type { Morph } from "../parse/ast/morph.ts"
import type { Narrow } from "../parse/ast/narrow.ts"
import { as } from "../parse/definition.ts"
import { chainableNoOpProxy } from "../utils/chainableNoOpProxy.ts"
import type { inferDomain } from "../utils/domains.ts"
import { throwParseError } from "../utils/errors.ts"
import type { conform, constructor, mutable } from "../utils/generics.ts"
import type { ComparisonState, Compilation, TypeNode } from "./node.ts"
import { Node } from "./node.ts"
import { DivisibilityNode } from "./rules/divisibility.ts"
import { DomainNode } from "./rules/domain.ts"
import { EqualityNode } from "./rules/equality.ts"
import { InstanceNode } from "./rules/instance.ts"
import { MorphNode } from "./rules/morph.ts"
import { NarrowNode } from "./rules/narrow.ts"
import type { Props } from "./rules/props.ts"
import { PropsNode } from "./rules/props.ts"
import type { Range } from "./rules/range.ts"
import { RangeNode } from "./rules/range.ts"
import { RegexNode } from "./rules/regex.ts"

export class BranchNode<
    const definition extends RuleSet = RuleSet
> extends Node<TypeNode> {
    definition: definition
    rules: RuleNodes

    constructor(definition: definition) {
        super("TODO")
        const rules = {} as mutable<RuleNodes>
        let kind: RuleKind
        for (kind in definition as RuleDefinitions) {
            rules[kind] = createRuleNode(kind, definition) as any
        }
        this.definition = definition as definition
        this.rules = rules
    }

    declare [as]: this["infer"]

    get infer(): inferRuleSet<definition> {
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
} as const

type inferRuleSet<rules extends RuleSet> = rules extends Constraints
    ? inferDomain<rules["domain"]>
    : rules extends ExactValue<infer value>
    ? value
    : never

type ruleBranch<rules extends RuleSet> = rules extends Constraints
    ? Constraints & { domain: rules["domain"] }
    : ExactValue

export type validateRules<rules extends RuleSet> = {
    [k in keyof rules]: k extends keyof ruleBranch<rules> ? rules[k] : never
}

export type RuleSet = ExactValue | Constraints

type ExactValue<value = unknown> = {
    value: value
    morphs?: Morph[]
}

type Constraints = {
    narrows?: Narrow[]
    morphs?: Morph[]
} & (
    | {
          domain: "object"
          instance?: constructor
          props?: Props
      }
    | {
          domain: "object"
          instance: Array<any>
          props?: Props
          range?: Range
      }
    | {
          domain: "string"
          regex?: string[]
          range?: Range
      }
    | {
          domain: "number"
          divisor?: number
          range?: Range
      }
    | { domain: "bigint" }
    | { domain: "symbol" }
)

type RuleNodeKinds = typeof ruleNodeKinds

type RuleKind = keyof RuleNodeKinds

type RuleNodes = {
    [k in RuleKind]: RuleNodeKinds[k] extends constructor<infer node>
        ? node
        : never
}

type RuleDefinitions = {
    [k in RuleKind]: RuleNodes[k] extends { definition: infer def }
        ? def
        : never
}

const createRuleNode = <kind extends RuleKind>(
    kind: kind,
    def: RuleDefinitions[kind]
) => new ruleNodeKinds[kind](def as never) as RuleNodes[kind]
