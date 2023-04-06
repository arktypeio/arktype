import type { Filter } from "../parse/ast/filter.ts"
import type { Morph } from "../parse/ast/morph.ts"
import type { inferDomain } from "../utils/domains.ts"
import type { constructor } from "../utils/generics.ts"
import { DivisibilityNode } from "./divisibility.ts"
import { DomainNode } from "./domain.ts"
import { EqualityNode } from "./equality.ts"
import { FilterNode } from "./filter.ts"
import { InstanceNode } from "./instance.ts"
import { MorphNode } from "./morph.ts"
import type { ComparisonState, CompilationState } from "./node.ts"
import { Node } from "./node.ts"
import { PropsNode } from "./props.ts"
import type { Bounds } from "./range.ts"
import { RangeNode } from "./range.ts"
import { RegexNode } from "./regex.ts"

export class ConstraintsNode extends Node<typeof ConstraintsNode> {
    constructor(rule: ConstraintsRule) {
        super(ConstraintsNode, rule)
    }

    static from(constraints: ConstraintsDefinition) {
        const children: ConstraintsRule = {}
        let kind: ConstraintKind
        for (kind in constraints) {
            children[kind] = new constraintKinds[kind](
                (constraints as any)[kind] as never
            ) as any
        }
        return new ConstraintsNode(children)
    }

    static compile(rules: ConstraintsRule, s: CompilationState) {
        return s.data ? `${rules}` : ""
    }

    static intersection(
        l: ConstraintsNode,
        r: ConstraintsNode,
        s: ComparisonState
    ) {
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

export const constraintKinds = {
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

type ConstraintNodeKinds = typeof constraintKinds

type ConstraintKind = keyof ConstraintNodeKinds

export type inferConstraints<constraints extends ConstraintsDefinition> =
    constraints extends DomainDefinition
        ? inferDomain<constraints["domain"]>
        : constraints extends ExactValueDefinition<infer value>
        ? value
        : never

type constraintBranch<rules extends ConstraintsDefinition> =
    rules extends DomainDefinition
        ? DomainDefinition & { domain: rules["domain"] }
        : ExactValueDefinition

export type validateConstraints<rules extends ConstraintsDefinition> = {
    [k in keyof rules]: k extends keyof constraintBranch<rules>
        ? rules[k]
        : never
}

export type ConstraintsDefinition = ExactValueDefinition | DomainDefinition

type ExactValueDefinition<value = unknown> = {
    value: value
    morphs?: Morph[]
}

type DomainDefinition = {
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

export type ConstraintsRule = {
    [k in ConstraintKind]?: ConstraintNodeKinds[k] extends constructor<
        infer node
    >
        ? node
        : never
}
