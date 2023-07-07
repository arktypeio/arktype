import type {
    AbstractableConstructor,
    Domain,
    evaluate,
    inferDomain,
    isUnknown,
    List,
    listable
} from "@arktype/utils"
import { domainOf, throwInternalError } from "@arktype/utils"
import type { CompilationContext } from "../../compiler/compile.js"
import { assertAllowsConstraint } from "../../parser/semantic/validate.js"
import type {
    inferMorphOut,
    Morph,
    Narrow,
    NarrowCast,
    Out
} from "../../parser/tuple.js"
import type { NodeKind, NodeKinds } from "../base.js"
import { NodeBase } from "../base.js"
import { Disjoint } from "../disjoint.js"
import type { BasisInput, BasisNode, inferBasis } from "../primitive/basis.js"
import type { Bound, BoundNode } from "../primitive/bound.js"
import { ClassNode } from "../primitive/class.js"
import type { DivisorNode } from "../primitive/divisor.js"
import { DomainNode } from "../primitive/domain.js"
import type { NarrowNode } from "../primitive/narrow.js"
import type { RegexNode, SerializedRegexLiteral } from "../primitive/regex.js"
import { UnitNode } from "../primitive/unit.js"
import type { inferPropsInput, PropsInput } from "../properties/parse.js"
import type { PropertiesNode } from "../properties/properties.js"
import type { TypeNode } from "../type.js"
import { builtins } from "../union/utils.js"

export type Constraints = {
    readonly basis?: BasisNode
    readonly bound?: readonly BoundNode[]
    readonly divisor?: DivisorNode
    readonly regex?: readonly RegexNode[]
    readonly properties?: PropertiesNode
    readonly narrow?: readonly NarrowNode[]
}

export type ConstraintKind = keyof Constraints

export class PredicateNode extends NodeBase implements Constraints {
    readonly kind = "predicate"
    readonly basis?: Constraints["basis"]
    readonly bound?: Constraints["bound"]
    readonly divisor?: Constraints["divisor"]
    readonly regex?: Constraints["regex"]
    readonly properties?: Constraints["properties"]
    readonly narrow?: Constraints["narrow"]

    constructor(
        public readonly constraints: Constraints,
        public readonly meta: {}
    ) {
        super()
        Object.assign(this, constraints)
    }

    intersect(other: PredicateNode): PredicateNode | Disjoint {
        const basis = this.basis
            ? other.basis
                ? this.basis.intersect(other.basis)
                : this.basis
            : other.basis
        if (basis instanceof Disjoint) {
            return basis
        }
        // TODO: figure out how .value works with morphs & other metadata
        if (this.basis?.hasKind("unit")) {
            if (!other.allows(this.basis.rule)) {
                return Disjoint.from("assignability", other, this.basis)
            }
        } else if (other.basis?.hasKind("unit")) {
            if (!this.allows(other.basis.rule)) {
                return Disjoint.from("assignability", this, other.basis)
            }
        }
        const rules: PredicateChildren = basis ? [basis] : []
        for (const kind of constraintKindNames) {
            const lNode = this.getConstraints(kind)
            const rNode = other.getConstraints(kind)
            if (lNode) {
                if (rNode) {
                    // TODO: fix
                    const result = lNode
                    // lNode.intersect(rNode as never)
                    // we may be missing out on deep discriminants here if e.g.
                    // there is a range Disjoint between two arrays, each of which
                    // contains objects that are discriminable. if we need to find
                    // these, we should avoid returning here and instead collect Disjoints
                    // similarly to in PropsNode
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
        // TODO: bad context source
        return new PredicateNode(rules, this.meta)
    }

    compile(ctx: CompilationContext) {
        // TODO: can props imply object basis for compilation?
        let result = ""
        this.basis && ctx.bases.push(this.basis)
        for (const child of children) {
            const childResult = child.hasKind("props")
                ? child.compile(ctx)
                : compileCheck(
                      // TODO: fix
                      child.kind === "narrow" ? "custom" : child.kind,
                      child.rule,
                      child.compile(ctx),
                      ctx
                  )
            if (childResult) {
                result = result ? `${result}\n${childResult}` : childResult
            }
        }
        this.basis && ctx.bases.pop()
        return result
    }

    describe() {
        return this.rule.length === 0
            ? "unknown"
            : constraints.length
            ? `(${constraints.map((rule) => rule.toString()).join(" and ")})`
            : `${basis}`
    }

    value = // we only want simple unmorphed values
        this.basis?.hasKind("unit") && this.rule.length === 1
            ? basis
            : undefined

    keyof(): TypeNode {
        if (!this.basis) {
            return builtins.never()
        }
        const propsKey = this.properties?.keyof()
        return propsKey?.or(this.basis.keyof()) ?? this.basis.keyof()
    }

    constrain<kind extends ConstraintKind>(
        kind: kind,
        input: ConstraintsInput[kind]
    ): PredicateNode {
        const constraint = createNodeOfKind(kind, input as never, this.meta)
        assertAllowsConstraint(this.basis, constraint)
        const result = this.intersect(
            new PredicateNode([constraint], this.meta)
        )
        if (result instanceof Disjoint) {
            return result.throw()
        }
        return result
    }
}

// parse: (input, meta) => {
//     const result: mutable<PredicateRule> = {}
//     for (const k in input) {
//         if (!isKeyOf(k, constraintKinds)) {
//             return throwParseError(
//                 `'${k}' is not a valid constraint name (must be one of ${Object.keys(
//                     constraintKinds
//                 ).join(", ")})`
//             )
//         }
//         // TODO: parse basis
//         const constraints = listFrom(input[k])
//         result[k] = constraints.map((constraint) =>
//             hasArkKind(constraint, "node")
//                 ? constraint
//                 : //     TODO:       assertAllowsConstraint(basis, node)
//                   createNodeOfKind(k, constraint as never, meta)
//         ) as never
//     }
// },

export type ListableInputKind = "regex" | "narrow"

export type ConstraintNode = ConstraintKinds[ConstraintKind]

type ConstraintKinds = {
    [k in ConstraintKind]: k extends NodeKind ? NodeKinds[k] : BasisNode
}

export type PredicateInput<
    basis extends BasisInput | null = BasisInput | null
> =
    | Record<string, never>
    | evaluate<
          {
              basis: basis
          } & ConstraintsInput<basis>
      >

export type ConstraintsInput<
    basis extends BasisInput | null = BasisInput | null
> = BasisInput extends basis
    ? {
          // TODO: remove morphs here? just to get rid of some type errors reincluding
          [k in ConstraintKind | "morph"]?: k extends ConstraintKind
              ? unknownConstraintInput<k>
              : listable<Morph>
      }
    : basis extends BasisInput
    ? constraintsOf<basis>
    : functionalConstraints<unknown>

// TODO: fix
type unknownConstraintInput<kind extends ConstraintKind> = kind extends "props"
    ? PropsInput
    :
          | ConstraintKinds[kind]["rule"]
          // Add the unlisted version as a valid input for these kinds
          // TODO: fix these types, derive from nodes?
          | (kind extends ListableInputKind
                ? readonly ConstraintKinds[kind]["rule"][]
                : never)

export type inferPredicateDefinition<input extends PredicateInput> =
    input["morph"] extends Morph<any, infer out>
        ? (In: inferPredicateInput<input>) => Out<inferMorphOut<out>>
        : input["morph"] extends readonly [...any[], Morph<any, infer out>]
        ? (In: inferPredicateInput<input>) => Out<inferMorphOut<out>>
        : inferPredicateInput<input>

type inferPredicateInput<input extends PredicateInput> =
    input["narrow"] extends NarrowCast<any, infer narrowed>
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
              (head extends NarrowCast<any, infer narrowed>
                  ? narrowed
                  : unknown)
      >
    : evaluate<result>

type inferNonFunctionalConstraints<input extends PredicateInput> =
    input["basis"] extends BasisInput
        ? input["properties"] extends PropsInput
            ? inferPropsInput<input["properties"]>
            : inferBasis<input["basis"]>
        : unknown

type constraintsOf<basis extends BasisInput> = basis extends Domain
    ? functionalConstraints<inferDomain<basis>> & domainConstraints<basis>
    : basis extends AbstractableConstructor
    ? functionalConstraints<InstanceType<basis>> & classConstraints<basis>
    : basis extends readonly ["===", infer value]
    ? // Exact values cannot be filtered, but can be morphed
      Pick<functionalConstraints<value>, "morph">
    : never

type domainConstraints<basis extends Domain> = basis extends "object"
    ? {
          props?: PropsInput
      }
    : // TODO: narrow bound types
    basis extends "string"
    ? {
          regex?: listable<SerializedRegexLiteral>
          bound?: Bound
      }
    : basis extends "number"
    ? {
          divisor?: number
          bound?: Bound
      }
    : {}

type functionalConstraints<input> = {
    narrow?: listable<Narrow<input>>
    // TODO: remove?
    morph?: listable<Morph<input>>
}

type classConstraints<base extends AbstractableConstructor> = base extends
    | typeof Array
    | typeof Date
    ? {
          props?: PropsInput
          bound?: Bound
      }
    : {
          props?: PropsInput
      }

export type basisNodeFrom<input extends BasisInput> = input extends Domain
    ? DomainNode
    : input extends AbstractableConstructor
    ? ClassNode
    : UnitNode

export const basisNodeFrom = (
    input: BasisInput,
    // TODO: should be correlated with/part of input?
    meta: {}
): DomainNode | ClassNode | UnitNode => {
    switch (typeof input) {
        case "string":
            return new DomainNode(input, meta)
        case "object":
            return new UnitNode(input[1], meta)
        case "function":
            return new ClassNode(input, meta)
        default:
            return throwInternalError(
                `Unexpectedly got a basis input of type ${domainOf(input)}`
            )
    }
}
