import type { Filter } from "../parse/ast/filter.js"
import type { Morph } from "../parse/ast/morph.js"
import type { constructor, instanceOf } from "../utils/generics.js"
import { DivisibilityNode } from "./divisibility.js"
import { DomainNode } from "./domain.js"
import { EqualityNode } from "./equality.js"
import { FilterNode } from "./filter.js"
import { InstanceNode } from "./instance.js"
import { MorphNode } from "./morph.js"
import type { ComparisonState, CompilationState } from "./node.js"
import { Node } from "./node.js"
import type { PropsDefinition } from "./props.js"
import { PropsNode } from "./props.js"
import type { Bounds } from "./range.js"
import { RangeNode } from "./range.js"
import { RegexNode } from "./regex.js"

export class ConstraintsNode extends Node<typeof ConstraintsNode> {
    constructor(rule: ConstraintsDefinition) {
        super(ConstraintsNode, rule)
    }

    static from(constraints: ConstraintsDefinition) {
        // const children: ConstraintsRule = {}
        // let kind: ConstraintKind
        // for (kind in constraints) {
        //     children[kind] = new constraintKinds[kind](
        //         (constraints as any)[kind] as never
        //     ) as any
        // }
        // return new ConstraintsNode(children)
    }

    static compile(rules: ConstraintsDefinition, s: CompilationState) {
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

type ConstraintsRule = {
    [k in ConstraintKind]?: instanceOf<ConstraintNodeKinds[k]>
}

type ConstraintKind = keyof ConstraintNodeKinds

export type inferConstraints<constraints extends ConstraintsDefinition> =
    unknown
// constraints extends DomainConstraintsRule
//     ? inferDomain<constraints["domain"]>
//     : constraints extends ExactValueConstraintsRule<infer value>
//     ? value
//     : never

type constraintBranch<rules extends ConstraintsDefinition> =
    rules extends DomainConstraintsDefinition
        ? DomainConstraintsDefinition & { domain: rules["domain"] }
        : ExactValueConstraintsRule

export type validateConstraints<rules extends ConstraintsDefinition> = {
    [k in keyof rules]: k extends keyof constraintBranch<rules>
        ? rules[k]
        : never
}

export type ConstraintsDefinition =
    | ExactValueConstraintsRule
    | DomainConstraintsDefinition

const z: ConstraintsDefinition = {
    domain: "object",
    props: {
        named: {
            a: { kind: "required", value: [] }
        },
        indexed: []
    }
}

type ExactValueConstraintsRule<value = unknown> = {
    value: value
    morphs?: Morph[]
}

type DomainConstraintsDefinition = {
    filters?: Filter[]
    morphs?: Morph[]
} & (
    | {
          domain: "object"
          instance?: constructor
          props?: PropsDefinition
      }
    | {
          domain: "object"
          instance: typeof Array
          props?: PropsDefinition
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
