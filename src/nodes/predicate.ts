import type { inferMorphOut, Morph, Out } from "../parse/ast/morph.js"
import type { InferredNarrow, Narrow } from "../parse/ast/narrow.js"
import type { Domain, inferDomain } from "../utils/domains.js"
import { throwParseError } from "../utils/errors.js"
import type { evaluate, isUnknown } from "../utils/generics.js"
import type { List, listable } from "../utils/lists.js"
import type { Constructor, instanceOf } from "../utils/objectKinds.js"
import { isArray } from "../utils/objectKinds.js"
import { isKeyOf, type keySet } from "../utils/records.js"
import type { BasisInput, BasisNode, inferBasis } from "./basis/basis.js"
import { basisNodeFrom } from "./basis/from.js"
import type { ValueNode } from "./basis/value.js"
import type { CompilationState } from "./compilation.js"
import { DivisorNode } from "./constraints/divisor.js"
import { MorphNode } from "./constraints/morph.js"
import { NarrowNode } from "./constraints/narrow.js"
import type {
    inferPropsInput,
    NamedPropsInput,
    PropsInput,
    PropsInputTuple
} from "./constraints/props.js"
import { emptyPropsNode, PropsNode } from "./constraints/props.js"
import type { Bounds } from "./constraints/range.js"
import { RangeNode } from "./constraints/range.js"
import { RegexNode } from "./constraints/regex.js"
import type { DiscriminantKind } from "./discriminate.js"
import { Disjoint } from "./disjoint.js"
import { Node } from "./node.js"
import type { TypeNode } from "./type.js"
import { neverTypeNode } from "./type.js"

export class PredicateNode<t = unknown> extends Node<
    "predicate",
    PredicateRules,
    t
> {
    static readonly kind = "predicate"
    readonly subclass = PredicateNode

    get basis() {
        return this.children[0]?.kind === "basis" ? this.children[0] : undefined
    }

    get constraints() {
        return (
            this.basis ? this.children.slice(1) : this.children
        ) as ConstraintNode[]
    }

    static compile(rules: PredicateRules) {
        let result = ""
        for (const rule of rules) {
            if (rule.condition !== "true") {
                result += `${result && " && "}${rule.condition}`
            }
        }
        return result || "true"
    }

    static from<const input extends PredicateInput>(
        input: input
    ): PredicateNode<inferPredicateDefinition<input>> {
        const basis = input.basis && basisNodeFrom(input.basis)
        const rules: PredicateRules = basis ? [basis] : []
        for (const kind of constraintsByPrecedence) {
            if (input[kind]) {
                assertAllowsConstraint(basis, kind)
                rules.push(createConstraint(kind, input[kind]))
            }
        }
        return new PredicateNode<inferPredicateDefinition<input>>(...rules)
    }

    getConstraint<k extends ConstraintKind>(k: k) {
        return this.children.find((constraint) => constraint.kind === k) as
            | instanceOf<ConstraintKinds[k]>
            | undefined
    }

    toString() {
        return this.children.length === 0
            ? "unknown"
            : this.children.map((rule) => rule.toString()).join(" and ")
    }

    compileTraverse(s: CompilationState) {
        let result = this.basis?.compileTraverse(s) ?? ""
        for (const constraint of this.children) {
            result += "\n" + constraint.compileTraverse(s)
        }
        return result
    }

    get valueNode(): ValueNode | undefined {
        return this.basis?.hasLevel("value") ? this.basis : undefined
    }

    intersectNode(r: PredicateNode): PredicateNode | Disjoint {
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
        const basis = this.basis
            ? r.basis
                ? this.basis.intersect(r.basis)
                : this.basis
            : r.basis
        if (basis instanceof Disjoint) {
            return basis
        }
        if (this.valueNode) {
            return r.allows(this.valueNode.child)
                ? this
                : Disjoint.from("assignability", this.valueNode, r)
        }
        if (r.valueNode) {
            return this.allows(r.valueNode.child)
                ? r
                : Disjoint.from("assignability", this, r.valueNode)
        }
        const rules: PredicateRules = basis ? [basis] : []
        for (const kind of constraintsByPrecedence) {
            const lNode = this.getConstraint(kind)
            const rNode = r.getConstraint(kind)
            if (lNode) {
                if (rNode) {
                    const result = lNode.intersect(rNode as never)
                    // TODO: don't return here
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
        return new PredicateNode(...rules)
    }

    constrain<kind extends ConstraintKind>(
        kind: kind,
        input: ConstraintsInput[kind]
    ): PredicateNode {
        assertAllowsConstraint(this.basis, kind)
        const result = this.intersect(
            new PredicateNode(createConstraint(kind, input))
        )
        if (result instanceof Disjoint) {
            return result.throw()
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
            return new PredicateNode(...this.constraints)
        }
        const prunedProps = this.getConstraint("props")!.pruneDiscriminant(
            path,
            kind
        )
        const rules: PredicateRules = []
        for (const rule of this.children) {
            if (rule.kind === "basis") {
                if (!rule.hasLevel("domain") || rule.domain !== "object") {
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
        return new PredicateNode(...rules)
    }

    private _keyof?: TypeNode
    keyof() {
        if (this._keyof) {
            return this._keyof
        }
        if (!this.basis) {
            return neverTypeNode
        }
        const basisKey = this.basis.keyof()
        const propsKey = this.getConstraint("props")?.keyof()
        this._keyof = propsKey?.or(basisKey) ?? basisKey
        return this._keyof
    }
}

const assertAllowsConstraint = (
    basis: BasisNode | undefined,
    kind: ConstraintKind
) => {
    if (basis === undefined) {
        return kind === "narrow" || kind === "morph"
            ? undefined
            : throwParseError(`${kind} constraint requires a basis`)
    }
    return basis.assertAllowsConstraint(kind)
}

const constraintsByPrecedence = [
    "divisor",
    "range",
    "regex",
    "props",
    "narrow",
    "morph"
] as const satisfies List<ConstraintKind>

const listableInputKinds = {
    regex: true,
    narrow: true,
    morph: true,
    range: true,
    divisor: true
} satisfies keySet<ConstraintKind>

type ListableInputKind = keyof typeof listableInputKinds

export const unknownPredicateNode = new PredicateNode()

export type PredicateRules = [BasisNode, ...ConstraintNode[]] | ConstraintNode[]

export const createConstraint = <kind extends ConstraintKind>(
    kind: kind,
    input: ConstraintsInput[kind]
) =>
    (kind === "props"
        ? isArray(input)
            ? PropsNode.from(...(input as PropsInputTuple))
            : PropsNode.from(input as NamedPropsInput)
        : new constraintKinds[kind as Exclude<ConstraintKind, "props">](
              (isKeyOf(kind, listableInputKinds) && !isArray(input)
                  ? [input]
                  : input) as never
          )) as ConstraintNode<kind>

export const constraintKinds = {
    range: RangeNode,
    divisor: DivisorNode,
    regex: RegexNode,
    props: PropsNode,
    narrow: NarrowNode,
    morph: MorphNode
} as const

export type ConstraintNode<kind extends ConstraintKind = ConstraintKind> =
    instanceOf<ConstraintKinds[kind]>

type ConstraintKinds = typeof constraintKinds

export type RuleKind = "basis" | ConstraintKind

export type ConstraintKind = keyof ConstraintKinds

export type PredicateInput<
    basis extends BasisInput | undefined = BasisInput | undefined
> = evaluate<
    {
        basis: basis
    } & ConstraintsInput<basis>
>

export type ConstraintsInput<
    basis extends BasisInput | undefined = BasisInput | undefined
> = BasisInput extends basis
    ? {
          [k in ConstraintKind]?: unknownConstraintInput<k>
      }
    : basis extends BasisInput
    ? constraintsOf<basis>
    : functionalConstraints<unknown>

type unknownConstraintInput<kind extends ConstraintKind> = kind extends "props"
    ? PropsInput
    :
          | ConstraintNode<kind>["children"]
          // Add the unlisted version as a valid input for these kinds
          | (kind extends ListableInputKind
                ? ConstraintNode<kind>["children"][number]
                : never)

export type inferPredicateDefinition<input extends PredicateInput> =
    input["morph"] extends Morph<any, infer out>
        ? (In: inferPredicateInput<input>) => Out<inferMorphOut<out>>
        : input["morph"] extends readonly [...any[], Morph<any, infer out>]
        ? (In: inferPredicateInput<input>) => Out<inferMorphOut<out>>
        : inferPredicateInput<input>

type inferPredicateInput<input extends PredicateInput> =
    input["narrow"] extends InferredNarrow<any, infer narrowed>
        ? narrowed
        : input["narrow"] extends List<Narrow>
        ? inferNarrowArray<input["narrow"]> extends infer result
            ? isUnknown<result> extends true
                ? inferNonFunctionalConstraints<input>
                : result
            : never
        : inferNonFunctionalConstraints<input>

type inferNarrowArray<
    filters extends List,
    result = unknown
> = filters extends readonly [infer head, ...infer tail]
    ? inferNarrowArray<
          tail,
          result &
              (head extends InferredNarrow<any, infer narrowed>
                  ? narrowed
                  : unknown)
      >
    : evaluate<result>

type inferNonFunctionalConstraints<input extends PredicateInput> =
    input["basis"] extends BasisInput
        ? input["props"] extends PropsInput
            ? inferPropsInput<input["props"]>
            : inferBasis<input["basis"]>
        : unknown

type constraintsOf<basis extends BasisInput> = basis extends Domain
    ? functionalConstraints<inferDomain<basis>> & domainConstraints<basis>
    : basis extends Constructor
    ? functionalConstraints<instanceOf<Constructor>> & classConstraints<basis>
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
    narrow?: listable<Narrow<input>>
    morph?: listable<Morph<input>>
}

type classConstraints<base extends Constructor> = base extends typeof Array
    ? {
          props?: PropsInput
          range?: Bounds
      }
    : {
          props?: PropsInput
      }
