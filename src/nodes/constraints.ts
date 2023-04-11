import type { Filter } from "../parse/ast/filter.js"
import type { Morph } from "../parse/ast/morph.js"
import { as } from "../parse/definition.js"
import type { constructor, instanceOf } from "../utils/generics.js"
import { DivisibilityNode } from "./divisibility.js"
import { DomainNode } from "./domain.js"
import { EqualityNode } from "./equality.js"
import { FilterNode } from "./filter.js"
import { InstanceNode } from "./instance.js"
import { MorphNode } from "./morph.js"
import type { ComparisonState, CompilationState } from "./node.js"
import { Node } from "./node.js"
import type { PropsInput } from "./props.js"
import { PropsNode } from "./props.js"
import type { Bounds } from "./range.js"
import { RangeNode } from "./range.js"
import { RegexNode } from "./regex.js"

export class ConstraintsNode<t = unknown> extends Node<typeof ConstraintsNode> {
    declare [as]: t

    constructor(child: ConstraintsChild) {
        super(ConstraintsNode, child)
    }

    static from(input: ConstraintsInput) {
        const child: ConstraintsChild = {}
        const constraints = input as UnknownConstraintsInput
        let kind: ConstraintKind
        for (kind in constraints) {
            child[kind] =
                kind === "props"
                    ? PropsNode.from(constraints[kind])
                    : new (constraintKinds[kind] as constructor<any>)(
                          constraints[kind]
                      )
        }
        return new ConstraintsNode(child)
    }

    static compile(rules: ConstraintsChild, s: CompilationState) {
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

type ConstraintsChild = {
    [k in ConstraintKind]?: instanceOf<ConstraintNodeKinds[k]>
}

type UnknownConstraintsInput = {
    [k in ConstraintKind]: k extends "props"
        ? PropsInput
        : instanceOf<ConstraintNodeKinds[k]>["child"]
}

type ConstraintKind = keyof ConstraintNodeKinds

export type inferConstraintsInput<input extends ConstraintsInput> = unknown
// constraints extends DomainConstraintsRule
//     ? inferDomain<constraints["domain"]>
//     : constraints extends ExactValueConstraintsRule<infer value>
//     ? value
//     : never

type constraintInputBranch<input extends ConstraintsInput> =
    input extends DomainConstraintsInput
        ? DomainConstraintsInput & { domain: input["domain"] }
        : ExactValueInput

export type validateConstraintsInput<input extends ConstraintsInput> = {
    [k in keyof input]: k extends keyof constraintInputBranch<input>
        ? input[k]
        : never
}

export type ConstraintsInput = ExactValueInput | DomainConstraintsInput

const z: ConstraintsInput = {
    domain: "object",
    props: {
        named: {
            a: { kind: "required", value: [] }
        },
        indexed: []
    }
}

type ExactValueInput<value = unknown> = {
    value: value
    morphs?: Morph[]
}

type DomainConstraintsInput = {
    filters?: Filter[]
    morphs?: Morph[]
} & (
    | {
          domain: "object"
          instance?: constructor
          props?: PropsInput
      }
    | {
          domain: "object"
          instance: typeof Array
          props?: PropsInput
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
