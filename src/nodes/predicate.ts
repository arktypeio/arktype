import type { Filter } from "../parse/ast/filter.js"
import type { inferMorphOut, Morph } from "../parse/ast/morph.js"
import { as } from "../parse/definition.js"
import type { Domain } from "../utils/domains.js"
import { throwParseError } from "../utils/errors.js"
import type {
    conform,
    constructor,
    exact,
    instanceOf,
    keySet
} from "../utils/generics.js"
import type { BaseConstraint } from "./base.js"
import { DivisibilityNode } from "./divisibility.js"
import { FilterNode } from "./filter.js"
import { MorphNode } from "./morph.js"
import type { CompiledAssertion } from "./node.js"
import { ComparisonState, Node } from "./node.js"
import type { PropsInput } from "./props.js"
import { PropsNode } from "./props.js"
import type { Bounds } from "./range.js"
import { RangeNode } from "./range.js"
import { RegexNode } from "./regex.js"

export class PredicateNode<t = unknown> extends Node<typeof PredicateNode> {
    declare [as]: t

    readonly kind = "predicate"

    constructor(public rules: Constraint[]) {
        super(PredicateNode, rules)
        validateRuleKeys(this)
    }

    getKinds() {
        return this.rules.map((rule) => rule.kind)
    }

    getEntries() {
        return this.rules.map((rule) => [rule.kind, rule] as ConstraintEntry)
    }

    getRule<kind extends ConstraintKind>(kind: kind) {
        return this.rules.find((rule) => rule.kind === kind) as
            | instanceOf<ConstraintKinds[kind]>
            | undefined
    }

    static from<const input extends RuleSet>(
        input: conform<input, validateConstraintsInput<input>>
    ) {
        const constraints = input as PredicateDefinition
        const rules: Constraint[] = []
        // if (constraints.value) {
        //     rules.push(new EqualityNode(constraints.value))
        // } else if (constraints.instance) {
        //     rules.push(new InstanceNode(constraints.instance))
        // } else {
        //     rules.push(new BaseNode(constraints.domain!))
        // }
        if (constraints.divisor) {
            rules.push(new DivisibilityNode(constraints.divisor))
        }
        if (constraints.range) {
            rules.push(new RangeNode(constraints.range))
        }
        if (constraints.regex) {
            rules.push(new RegexNode(constraints.regex))
        }
        if (constraints.props) {
            rules.push(PropsNode.from(constraints.props))
        }
        return new PredicateNode<inferRuleSet<input>>(rules)
    }

    static compile(rules: Constraint[]) {
        return rules.map((rule) => rule.key).join(" && ") as CompiledAssertion
    }

    intersect(other: PredicateNode, s: ComparisonState) {
        // if (
        //     // s.lastOperator === "&" &&
        //     rules.morphs?.some(
        //         (morph, i) => morph !== branch.tree.morphs?.[i]
        //     )
        // ) {
        //     throwParseError(
        //         writeImplicitNeverMessage(s.path, "Intersection", "of morphs")
        //     )
        // }
        const resultInput = Object.fromEntries(this.getEntries())
        for (const rule of other.rules) {
            const matchingRule = this.getRule(rule.kind)
            if (matchingRule) {
                resultInput[rule.kind] = matchingRule.intersect(
                    rule as never,
                    s
                ) as any
            } else {
                resultInput[rule.kind] = rule
            }
        }
        return new PredicateNode(resultInput)
    }

    // TODO: find a better way to combine with intersect
    constrain(constraints: ValidationConstraints) {
        const resultInput = Object.fromEntries(this.getEntries())
        let kind: ConstraintKind
        for (kind in constraints) {
            const constraintNode = new (constraintKinds[
                kind
            ] as constructor<any>)(constraints[kind])
            const matchingRule = this.getRule(kind)
            if (matchingRule) {
                resultInput[kind] = matchingRule.intersect(
                    constraintNode as never,
                    new ComparisonState()
                ) as any
            } else {
                resultInput[kind] = constraintNode
            }
        }
        return new PredicateNode(resultInput)
    }
}

export const constraintKinds = {
    range: RangeNode,
    divisor: DivisibilityNode,
    regex: RegexNode,
    props: PropsNode,
    filter: FilterNode,
    morph: MorphNode
} as const

type ConstraintKinds = typeof constraintKinds

type ConstraintEntry = {
    [k in ConstraintKind]: [k, instanceOf<ConstraintKinds[k]>]
}[ConstraintKind]

export type Constraint = instanceOf<ConstraintKinds[ConstraintKind]>

export type ValidationConstraints = Omit<PredicateDefinition, "morphs">

export type PredicateDefinition = {
    [k in ConstraintKind]?: k extends "props"
        ? PropsInput
        : ConstructorParameters<ConstraintKinds[k]>[0]
}

type ConstraintKind = keyof ConstraintKinds

// TODO: advanced constraints inference
export type inferRuleSet<input extends RuleSet> = input["morph"] extends Morph<
    any,
    infer out
>
    ? (In: inferInput<input>) => inferMorphOut<out>
    : input["morph"] extends [...any[], Morph<any, infer out>]
    ? (In: inferInput<input>) => inferMorphOut<out>
    : inferInput<input>

export type inferInput<input extends RuleSet> = input
//     input extends ExactValueRuleSet<
//     infer value
// >
//     ? value
//     : input extends ArrayRuleSet
//     ? unknown[]
//     : input extends NonArrayObjectRuleSet
//     ? input["instance"] extends constructor<infer t>
//         ? t extends Function
//             ? (...args: any[]) => unknown
//             : t
//         : object
//     : input extends DomainRuleSet
//     ? inferDomain<input["domain"]>
//     : never

// type discriminateConstraintsInputBranch<branch extends RuleSet> =
//     branch extends {
//         domain: infer domain extends Domain
//     }
//         ? domain extends "object"
//             ? branch extends { instance: typeof Array }
//                 ? ArrayRuleSet
//                 : NonArrayObjectRuleSet
//             : DomainRuleSet & { domain: domain }
//         : ExactValueRuleSet

export type validateConstraintsInput<input extends RuleSet> = exact<
    input,
    input
>

const validateRuleKeys = (rules: PredicateNode) => {
    if (rules.getRule("divisor")) {
    }
}

const validateRuleKeysFromSet = (
    rules: PredicateNode,
    allowedKeys: keySet<ConstraintKind>,
    description: string
) => {
    const inputKeys = rules.getKinds()
    const disallowedValueKeys = inputKeys.filter((k) => !(k in allowedKeys))
    if (disallowedValueKeys.length) {
        throwParseError(
            `Constraints ${disallowedValueKeys.join(
                ", "
            )} are not allowed for ${description}.`
        )
    }
}

export type RuleSet<base extends BaseConstraint = BaseConstraint> = {
    base: base
    morph?: Morph[]
    // TODO: Don't allow exact value filter
    filter?: Filter[]
} & constraintsOf<base>

type constraintsOf<base extends BaseConstraint> = base extends Domain
    ? domainConstraintsOf<base>
    : base extends constructor
    ? constructorConstraintsOf<base>
    : {}

type domainConstraintsOf<base extends Domain> = base extends "object"
    ? {
          props?: PropsInput
      }
    : base extends "string"
    ? {
          regex?: string[]
          range?: Bounds
      }
    : base extends "number"
    ? {
          divisor?: number
          range?: Bounds
      }
    : {}

type constructorConstraintsOf<base extends constructor> =
    base extends typeof Array
        ? {
              props?: PropsInput
              range?: Bounds
          }
        : {
              props?: PropsInput
          }

// type KeyValue = string | number | symbol | RegExp

// const baseKeysByDomain: Record<Domain, readonly KeyValue[]> = {
//     bigint: prototypeKeysOf(0n),
//     boolean: prototypeKeysOf(false),
//     null: [],
//     number: prototypeKeysOf(0),
//     // TS doesn't include the Object prototype in keyof, so keyof object is never
//     object: [],
//     string: prototypeKeysOf(""),
//     symbol: prototypeKeysOf(Symbol()),
//     undefined: []
// }

// const arrayIndexStringBranch = RulesNode.from({
//     domain: "string",
//     regex: wellFormedNonNegativeIntegerMatcher.source
// })

// const arrayIndexNumberBranch = RulesNode.from({
//     domain: "number",
//     range: {
//         ">=": 0
//     },
//     divisor: 1
// })
