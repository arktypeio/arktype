import type { Filter } from "../parse/ast/filter.js"
import type { inferMorphOut, Morph } from "../parse/ast/morph.js"
import { as } from "../parse/definition.js"
import type { Domain } from "../utils/domains.js"
import type { constructor, evaluate, instanceOf } from "../utils/generics.js"
import type { Basis, inferBasis } from "./basis.js"
import { BasisNode } from "./basis.js"
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
    basis: BasisNode
    constraints: ConstraintNode[]

    constructor(public rules: RuleNodes) {
        super(PredicateNode, rules)
        this.basis = rules[0]
        this.constraints = rules.slice(1) as ConstraintNode[]
    }

    getConstraintKeys() {
        return this.constraints.map((constraint) => constraint.kind)
    }

    getEntries() {
        return this.constraints.map(
            (constraint) => [constraint.kind, constraint] as ConstraintEntry
        )
    }

    getConstraint<k extends ConstraintKind>(k: k) {
        return this.constraints.find((constraint) => constraint.kind === k) as
            | instanceOf<ConstraintKinds[k]>
            | undefined
    }

    static from<const input extends RuleSet>(input: input) {
        const def = input as PredicateDefinition
        const rules: RuleNodes = [new BasisNode(def.basis)]
        // TODO: validate input
        if (def.divisor) {
            rules.push(new DivisibilityNode(def.divisor))
        }
        if (def.range) {
            rules.push(new RangeNode(def.range))
        }
        if (def.regex) {
            rules.push(new RegexNode(def.regex))
        }
        if (def.props) {
            rules.push(PropsNode.from(def.props))
        }
        return new PredicateNode<inferRuleSet<input>>(rules)
    }

    static compile(rules: RuleNodes) {
        return rules.map((rule) => rule.key).join(" && ") as CompiledAssertion
    }

    get literalValue(): BasisNode<"value"> | undefined {
        return this.basis.hasLevel("value") ? this.basis : undefined
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
        for (const rule of other.constraints) {
            const matchingRule = this.getConstraint(rule.kind)
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
    constrain(constraints: ConstraintsDefinition) {
        const resultInput = Object.fromEntries(this.getEntries())
        let kind: ConstraintKind
        for (kind in constraints) {
            const constraintNode = new (constraintKinds[
                kind
            ] as constructor<any>)(constraints[kind])
            const matchingRule = this.getConstraint(kind)
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

export type RuleNodes = [basis: BasisNode, ...constraints: ConstraintNode[]]

export const constraintKinds = {
    range: RangeNode,
    divisor: DivisibilityNode,
    regex: RegexNode,
    props: PropsNode,
    filter: FilterNode,
    morph: MorphNode
} as const

export type PredicateDefinition = evaluate<
    { basis: Basis } & {
        [k in ConstraintKind]?: k extends "props"
            ? PropsInput
            : ConstructorParameters<ConstraintKinds[k]>[0]
    }
>

export type ConstraintsDefinition = Omit<
    PredicateDefinition,
    "basis" | "morphs"
>

export type ConstraintNode = instanceOf<ConstraintKinds[ConstraintKind]>

type ConstraintKinds = typeof constraintKinds

type ConstraintEntry = {
    [k in ConstraintKind]: [k, instanceOf<ConstraintKinds[k]>]
}[ConstraintKind]

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

export type inferInput<input extends RuleSet> = inferBasis<input["basis"]>

// type discriminateConstraintsInputBranch<branch extends RuleSet> =
//     branch extends {
//         kind: infer domain extends Domain
//     }
//         ? domain extends "object"
//             ? branch extends { instance: typeof Array }
//                 ? ArrayRuleSet
//                 : NonArrayObjectRuleSet
//             : DomainRuleSet & { kind: domain }
//         : ExactValueRuleSet

// export type validateConstraintsInput<input extends RuleSet> = exact<
//     input,
//     input
// >

export type RuleSet<basis extends Basis = Basis> = {
    basis: basis
    morph?: Morph | Morph[]
    // TODO: Don't allow exact value filter
    filter?: Filter | Filter[]
} & constraintsOf<basis>

type constraintsOf<base extends Basis> = base extends Domain
    ? kindConstraints<base>
    : base extends constructor
    ? constructorConstraints<base>
    : {}

type kindConstraints<base extends Domain> = base extends "object"
    ? {
          props?: PropsInput
      }
    : base extends "string"
    ? {
          regex?: string | string[]
          range?: Bounds
      }
    : base extends "number"
    ? {
          divisor?: number
          range?: Bounds
      }
    : {}

type constructorConstraints<base extends constructor> =
    base extends typeof Array
        ? {
              props?: PropsInput
              range?: Bounds
          }
        : {
              props?: PropsInput
          }

// type KeyValue = string | number | symbol | RegExp

// const baseKeysBykind: Record<Domain, readonly KeyValue[]> = {
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
//     kind: "string",
//     regex: wellFormedNonNegativeIntegerMatcher.source
// })

// const arrayIndexNumberBranch = RulesNode.from({
//     kind: "number",
//     range: {
//         ">=": 0
//     },
//     divisor: 1
// })
