import type { Filter } from "../parse/ast/filter.js"
import type { inferMorphOut, Morph } from "../parse/ast/morph.js"
import { inferred } from "../parse/definition.js"
import type { Domain, inferDomain } from "../utils/domains.js"
import { throwParseError } from "../utils/errors.js"
import type { evaluate } from "../utils/generics.js"
import type { List } from "../utils/lists.js"
import type { constructor, instanceOf } from "../utils/objectKinds.js"
import { isArray } from "../utils/objectKinds.js"
import type { Basis, inferBasis } from "./basis.js"
import { BasisNode } from "./basis.js"
import type { CompilationState } from "./compilation.js"
import type { DiscriminantKind } from "./discriminate.js"
import { Disjoint } from "./disjoint.js"
import { DivisibilityNode } from "./divisibility.js"
import { FilterNode } from "./filter.js"
import { MorphNode } from "./morph.js"
import { Node } from "./node.js"
import type { NamedPropsInput, PropsInput, PropsInputTuple } from "./props.js"
import { emptyPropsNode, PropsNode } from "./props.js"
import type { Bounds } from "./range.js"
import { RangeNode } from "./range.js"
import { RegexNode } from "./regex.js"

export class PredicateNode<t = unknown> extends Node<"predicate"> {
    declare [inferred]: t

    static readonly kind = "predicate"
    basis: BasisNode | undefined
    constraints: ConstraintNode[]

    constructor(public rules: PredicateRules) {
        super(PredicateNode, rules)
        this.basis = rules[0]?.kind === "basis" ? rules[0] : undefined
        this.constraints = (
            this.basis ? rules.slice(1) : rules
        ) as ConstraintNode[]
    }

    getConstraint<k extends ConstraintKind>(k: k) {
        return this.rules.find((constraint) => constraint.kind === k) as
            | instanceOf<ConstraintKinds[k]>
            | undefined
    }

    static from<def extends PredicateNodeInput>(def: def) {
        if (def.basis === undefined) {
            const keys = Object.keys(def)
            return keys.length === 0
                ? unknownPredicateNode
                : throwParseError(
                      `Predicate must specify a basis key to specify others (got ${keys})`
                  )
        }
        const basis = new BasisNode(def.basis)
        const rules: PredicateRules = [basis]
        for (const kind of constraintsByPrecedence) {
            if (def[kind]) {
                basis.assertAllowsConstraint(kind)
                rules.push(createConstraint(kind, def[kind]))
            }
        }
        return new PredicateNode<inferPredicateDefinition<def>>(rules)
    }

    static compile(rules: PredicateRules) {
        let result = ""
        for (const rule of rules) {
            if (rule.key !== "true") {
                result += `${result && " && "}${rule.key}`
            }
        }
        return result || "true"
    }

    compileTraverse(s: CompilationState) {
        let result = this.basis?.compileTraverse(s) ?? ""
        for (const constraint of this.rules) {
            result += "\n" + constraint.compileTraverse(s)
        }
        return result
    }

    get valueNode(): BasisNode<"value"> | undefined {
        return this.basis?.hasLevel("value") ? this.basis : undefined
    }

    static intersect(l: PredicateNode, r: PredicateNode) {
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

        const basis = l.basis
            ? r.basis
                ? l.basis.intersect(r.basis)
                : l.basis
            : r.basis
        if (basis instanceof Disjoint) {
            return basis
        }
        if (l.valueNode) {
            return r.allows(l.valueNode.getLiteralValue())
                ? l
                : Disjoint.from("assignability", l.valueNode, r)
        }
        if (r.valueNode) {
            return l.allows(r.valueNode.getLiteralValue())
                ? r
                : Disjoint.from("assignability", l, r.valueNode)
        }
        const rules: PredicateRules = basis ? [basis] : []
        for (const kind of constraintsByPrecedence) {
            const lNode = l.getConstraint(kind)
            const rNode = r.getConstraint(kind)
            if (lNode) {
                if (rNode) {
                    const result = lNode.intersect(rNode as never)
                    if (result instanceof Disjoint) {
                        return result
                    }
                    rules.push(result)
                } else {
                    rules.push(lNode)
                }
            } else if (rNode) {
                rules.push(rNode)
            }
        }
        return new PredicateNode(rules)
    }

    assertAllowsConstraint(kind: ConstraintKind) {
        if (!this.basis) {
            if (kind !== "filter" && kind !== "morph") {
                throwParseError(`${kind} constraint requires a basis`)
            }
            return
        }
        return this.basis.assertAllowsConstraint(kind)
    }

    constrain<kind extends ConstraintKind>(
        kind: kind,
        input: ConstraintsInput[kind]
    ) {
        this.assertAllowsConstraint(kind)
        const result = this.intersect(
            new PredicateNode([createConstraint(kind, input)])
        )
        if (result instanceof Disjoint) {
            return throwParseError("Unsatisfiable")
        }
        return result
    }

    pruneDiscriminant(path: string[], kind: DiscriminantKind): PredicateNode {
        if (path.length === 0) {
            if (kind === "domain" && this.basis?.hasLevel("value")) {
                // if the basis specifies an exact value but was used to
                // discriminate based on a domain, we can't prune it
                return this
            }
            // create a new PredicateNode with the basis removed
            return new PredicateNode(this.constraints)
        }
        const prunedProps = this.getConstraint("props")!.pruneDiscriminant(
            path,
            kind
        )
        const rules: PredicateRules = []
        for (const rule of this.rules) {
            if (rule.kind === "basis") {
                if (rule.rule !== "object") {
                    rules.push(this.basis as never)
                }
            } else if (rule.kind === "props") {
                if (prunedProps !== emptyPropsNode) {
                    rules.push(prunedProps)
                }
            } else {
                rules.push(rule)
            }
        }
        return new PredicateNode(rules)
    }
}

const constraintsByPrecedence = [
    "divisor",
    "range",
    "regex",
    "props",
    "filter",
    "morph"
] as const satisfies List<ConstraintKind>

export const unknownPredicateNode = new PredicateNode([])

export type PredicateRules = [BasisNode, ...ConstraintNode[]] | ConstraintNode[]

export const createConstraint = <kind extends ConstraintKind>(
    kind: kind,
    input: ConstraintsInput[kind]
) =>
    (kind === "props"
        ? isArray(input)
            ? PropsNode.from(...(input as PropsInputTuple))
            : PropsNode.from(input as NamedPropsInput)
        : new constraintKinds[kind](input as never)) as ConstraintNode<kind>

export const constraintKinds = {
    range: RangeNode,
    divisor: DivisibilityNode,
    regex: RegexNode,
    props: PropsNode,
    filter: FilterNode,
    morph: MorphNode
} as const

export type ConstraintsDefinition = Omit<PredicateNodeInput, "basis" | "morphs">

export type ConstraintNode<kind extends ConstraintKind = ConstraintKind> =
    instanceOf<ConstraintKinds[kind]>

type ConstraintKinds = typeof constraintKinds

export type RuleKind = "basis" | ConstraintKind

export type ConstraintKind = keyof ConstraintKinds

export type PredicateNodeInput<basis extends Basis = Basis> =
    | Record<string, never>
    | evaluate<
          {
              basis: basis
          } & ConstraintsInput<basis>
      >

export type ConstraintsInput<basis extends Basis = Basis> = Basis extends basis
    ? {
          [k in ConstraintKind]?: k extends "props"
              ? PropsInput
              : ConstructorParameters<ConstraintKinds[k]>[0]
      }
    : constraintsOf<basis>

// TODO: migrate remaining inference
export type inferPredicateDefinition<def extends PredicateNodeInput> =
    def extends Record<string, never>
        ? unknown
        : def["morph"] extends Morph<any, infer out>
        ? (In: inferBasis<def["basis"]>) => inferMorphOut<out>
        : def["morph"] extends [...any[], Morph<any, infer out>]
        ? (In: inferBasis<def["basis"]>) => inferMorphOut<out>
        : inferBasis<def["basis"]>

type constraintsOf<basis extends Basis> = basis extends Domain
    ? functionalConstraints<inferDomain<basis>> & domainConstraints<basis>
    : basis extends constructor
    ? functionalConstraints<instanceOf<constructor>> & classConstraints<basis>
    : basis extends ["===", infer value]
    ? // Exact values cannot be filtered, but can be morphed
      Pick<functionalConstraints<value>, "morph">
    : never

type domainConstraints<basis extends Domain> = basis extends "object"
    ? {
          props?: PropsInput
      }
    : basis extends "string"
    ? {
          regex?: string | string[]
          range?: Bounds
      }
    : basis extends "number"
    ? {
          divisor?: number
          range?: Bounds
      }
    : {}

type functionalConstraints<input> = {
    filter?: Filter<input>
    morph?: Morph<input>
}

type classConstraints<base extends constructor> = base extends typeof Array
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
