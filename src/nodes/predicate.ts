import type { Filter, FilterPredicate } from "../parse/ast/filter.js"
import type { inferMorphOut, Morph } from "../parse/ast/morph.js"
import { inferred } from "../parse/definition.js"
import type { Domain, inferDomain } from "../utils/domains.js"
import { throwParseError } from "../utils/errors.js"
import type { evaluate, isUnknown } from "../utils/generics.js"
import type { HomogenousTuple, List, listable } from "../utils/lists.js"
import type { constructor, instanceOf } from "../utils/objectKinds.js"
import { isArray } from "../utils/objectKinds.js"
import type { Key } from "../utils/records.js"
import type { Basis, inferBasis } from "./basis.js"
import { BasisNode } from "./basis.js"
import type { CompilationState } from "./compilation.js"
import type { DiscriminantKind } from "./discriminate.js"
import { Disjoint } from "./disjoint.js"
import { DivisibilityNode } from "./divisibility.js"
import { FilterNode } from "./filter.js"
import { MorphNode } from "./morph.js"
import { Node } from "./node.js"
import type {
    arrayIndexInput,
    IndexedPropInput,
    IndexedPropsInput,
    NamedPropsInput,
    PropsInput,
    PropsInputTuple,
    PropTypeInput
} from "./props.js"
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

    static from<input extends PredicateInput>(
        input: input
    ): PredicateNode<inferPredicateDefinition<input>> {
        const basis = input.basis && new BasisNode(input.basis)
        const rules: PredicateRules = basis ? [basis] : []
        for (const kind of constraintsByPrecedence) {
            if (input[kind]) {
                assertAllowsConstraint(basis, kind)
                rules.push(createConstraint(kind, input[kind]))
            }
        }
        return new PredicateNode<inferPredicateDefinition<input>>(rules)
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

    constrain<kind extends ConstraintKind>(
        kind: kind,
        input: ConstraintsInput[kind]
    ) {
        assertAllowsConstraint(this.basis, kind)
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

const assertAllowsConstraint = (
    basis: BasisNode | undefined,
    kind: ConstraintKind
) => {
    if (basis === undefined) {
        if (kind !== "filter" && kind !== "morph") {
            throwParseError(`${kind} constraint requires a basis`)
        }
        return
    }
    return basis.assertAllowsConstraint(kind)
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

export type ConstraintNode<kind extends ConstraintKind = ConstraintKind> =
    instanceOf<ConstraintKinds[kind]>

type ConstraintKinds = typeof constraintKinds

export type RuleKind = "basis" | ConstraintKind

export type ConstraintKind = keyof ConstraintKinds

export type PredicateInput<
    basis extends Basis | undefined = Basis | undefined
> = evaluate<
    {
        basis: basis
    } & ConstraintsInput<basis>
>

export type ConstraintsInput<
    basis extends Basis | undefined = Basis | undefined
> = Basis extends basis
    ? {
          [k in ConstraintKind]?: k extends "props"
              ? PropsInput
              : ConstructorParameters<ConstraintKinds[k]>[0]
      }
    : basis extends Basis
    ? constraintsOf<basis>
    : functionalConstraints<unknown>

export type inferPredicateDefinition<input extends PredicateInput> =
    input["morph"] extends Morph<any, infer out>
        ? (In: inferPredicateInput<input>) => inferMorphOut<out>
        : input["morph"] extends readonly [...any[], Morph<any, infer out>]
        ? (In: inferPredicateInput<input>) => inferMorphOut<out>
        : inferPredicateInput<input>

type inferPredicateInput<input extends PredicateInput> =
    input["filter"] extends FilterPredicate<any, infer narrowed>
        ? narrowed
        : input["filter"] extends List<Filter>
        ? inferFilterArray<input["filter"]> extends infer result
            ? isUnknown<result> extends true
                ? inferNonFunctionalConstraints<input>
                : result
            : never
        : inferNonFunctionalConstraints<input>

type inferFilterArray<
    filters extends List,
    result = unknown
> = filters extends readonly [infer head, ...infer tail]
    ? inferFilterArray<
          tail,
          result &
              (head extends FilterPredicate<any, infer narrowed>
                  ? narrowed
                  : unknown)
      >
    : evaluate<result>

type inferNonFunctionalConstraints<input extends PredicateInput> =
    input["basis"] extends Basis
        ? input["props"] extends [
              infer named extends NamedPropsInput,
              ...infer indexed extends IndexedPropsInput
          ]
            ? evaluate<
                  inferNamedProps<named> & inferNamedAndIndexed<named, indexed>
              >
            : input["props"] extends infer named extends NamedPropsInput
            ? inferNamedProps<named>
            : inferBasis<input["basis"]>
        : unknown

type inferNamedProps<input extends NamedPropsInput> = {} extends input
    ? unknown
    : // Avoid iterating over prototype keys of tuple
    [keyof input, input] extends ["length", TupleLengthProps]
    ? unknown
    : evaluate<
          {
              [k in requiredKeyOf<input>]: inferTypeInput<input[k]["value"]>
          } & {
              [k in optionalKeyOf<input>]?: inferTypeInput<input[k]["value"]>
          }
      >

type inferTypeInput<input extends PropTypeInput> = inferPredicateDefinition<
    input extends readonly PredicateInput[] ? input[number] : input
>

type ArrayIndexInput = typeof arrayIndexInput

type TupleLengthProps<length extends number = number> = {
    length: {
        kind: "prerequisite"
        value: { basis: ["===", length] }
    }
}

type inferNamedAndIndexed<
    named extends NamedPropsInput,
    entries extends unknown[],
    result = inferNamedProps<named>
> = entries extends [IndexedPropInput<infer k, infer v>, ...infer tail]
    ? inferNamedAndIndexed<
          named,
          tail,
          result &
              (k extends ArrayIndexInput
                  ? inferArray<named, v>
                  : Record<Extract<inferTypeInput<k>, Key>, inferTypeInput<v>>)
      >
    : result

type inferArray<
    named extends NamedPropsInput,
    elementDef extends PropTypeInput
> = named extends TupleLengthProps<infer length>
    ? HomogenousTuple<inferTypeInput<elementDef>, length>
    : inferTypeInput<elementDef>[]

type requiredKeyOf<input extends NamedPropsInput> = Exclude<
    keyof input,
    optionalKeyOf<input>
>

type optionalKeyOf<input extends NamedPropsInput> = {
    [k in keyof input]: input[k]["kind"] extends "optional" ? k : never
}[keyof input]

type constraintsOf<basis extends Basis> = basis extends Domain
    ? functionalConstraints<inferDomain<basis>> & domainConstraints<basis>
    : basis extends constructor
    ? functionalConstraints<instanceOf<constructor>> & classConstraints<basis>
    : basis extends readonly ["===", infer value]
    ? // Exact values cannot be filtered, but can be morphed
      Pick<functionalConstraints<value>, "morph">
    : never

type domainConstraints<basis extends Domain> = basis extends "object"
    ? {
          props?: PropsInput
      }
    : basis extends "string"
    ? {
          regex?: listable<string>
          range?: Bounds
      }
    : basis extends "number"
    ? {
          divisor?: number
          range?: Bounds
      }
    : {}

type functionalConstraints<input> = {
    filter?: listable<Filter<input>>
    morph?: listable<Morph<input>>
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
