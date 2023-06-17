import { writeUnboundableMessage } from "../../parse/ast/bound.js"
import { writeIndivisibleMessage } from "../../parse/ast/divisor.js"
import type {
    inferMorphOut,
    Morph,
    Narrow,
    NarrowCast,
    Out
} from "../../parse/tuple.js"
import type { Domain, inferDomain } from "../../utils/domains.js"
import { domainOf } from "../../utils/domains.js"
import { throwInternalError, throwParseError } from "../../utils/errors.js"
import type { evaluate, isUnknown } from "../../utils/generics.js"
import type { List, listable } from "../../utils/lists.js"
import type {
    AbstractableConstructor,
    Constructor
} from "../../utils/objectKinds.js"
import { isArray } from "../../utils/objectKinds.js"
import { Disjoint } from "../disjoint.js"
import type { NodeKinds } from "../kinds.js"
import { createNodeOfKind, precedenceByKind } from "../kinds.js"
import type { BaseNode } from "../node.js"
import { defineNodeKind } from "../node.js"
import type {
    BasisInput,
    BasisNode,
    inferBasis
} from "../primitive/basis/basis.js"
import type { ClassNode } from "../primitive/basis/class.js"
import { classNode } from "../primitive/basis/class.js"
import type { DomainNode } from "../primitive/basis/domain.js"
import { domainNode } from "../primitive/basis/domain.js"
import type { ValueNode } from "../primitive/basis/value.js"
import { valueNode } from "../primitive/basis/value.js"
import type { Range } from "../primitive/range.js"
import type { inferPropsInput } from "./infer.js"
import type { PropsInput } from "./props.js"

export interface PredicateNode extends BaseNode<PredicateChildren> {
    basis: BasisNode | undefined
    constraints: ConstraintNode[]
    getConstraint: <k extends ConstraintKind>(k: k) => ConstraintKinds[k]
    valueNode: ValueNode | undefined
    constrain<kind extends ConstraintKind>(
        kind: kind,
        input: ConstraintsInput[kind]
    ): PredicateNode
}

export const predicateNode = defineNodeKind<PredicateNode, PredicateInput>(
    {
        kind: "predicate",
        parse: (input) => {
            let children: PredicateChildren
            if (isArray(input)) {
                children = input
            } else {
                const basis = input.basis && basisNodeFrom(input.basis)
                children = basis ? [basis] : []
                for (const kind of constraintKindNames) {
                    if (input[kind]) {
                        assertAllowsConstraint(basis, kind)
                        children.push(
                            createNodeOfKind(kind, input[kind] as never)
                        )
                    }
                }
            }
            // sort by precedence, and then alphabetically by kind
            return children.sort((l, r) =>
                precedenceByKind[l.kind] > precedenceByKind[r.kind]
                    ? 1
                    : precedenceByKind[l.kind] < precedenceByKind[r.kind]
                    ? -1
                    : l.kind > r.kind
                    ? 1
                    : -1
            )
        },
        compile: (children, state) => {
            let result = ""
            const initialChild = children.at(0)
            const basis = initialChild?.isBasis() ? initialChild : undefined
            if (basis) {
                state.bases.push(basis)
            }
            for (const child of children) {
                const childResult = child.compile(state)
                if (childResult) {
                    result = result ? `${result}\n${childResult}` : childResult
                }
            }
            if (basis) {
                state.bases.pop()
            }
            return result
        },
        intersect: (l, r): PredicateNode | Disjoint => {
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
                return r.allows(l.valueNode.rule)
                    ? l
                    : Disjoint.from("assignability", l.valueNode, r)
            }
            if (r.valueNode) {
                return l.allows(r.valueNode.rule)
                    ? r
                    : Disjoint.from("assignability", l, r.valueNode)
            }
            const rules: PredicateChildren = basis ? [basis] : []
            for (const kind of constraintKindNames) {
                const lNode = l.getConstraint(kind)
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
            return predicateNode(rules)
        }
    },
    (base) => {
        const initialRule = base.rule.at(0)
        const basis = initialRule?.isBasis() ? initialRule : undefined
        const constraints = (
            basis ? base.rule.slice(1) : base.rule
        ) as ConstraintNode[]
        const description =
            base.rule.length === 0
                ? "unknown"
                : constraints.length
                ? constraints.map((rule) => rule.toString()).join(" and ")
                : `${basis}`
        return {
            description,
            basis,
            constraints,
            getConstraint: (k) =>
                constraints.find(
                    (constraint) => constraint.kind === k
                ) as never,
            valueNode: basis?.hasKind("value") ? basis : undefined,
            constrain(kind, input): PredicateNode {
                assertAllowsConstraint(this.basis, kind)
                const constraint = createNodeOfKind(kind, input as never)
                const result = this.intersect(predicateNode([constraint]))
                if (result instanceof Disjoint) {
                    return result.throw()
                }
                return result
            }
        }
    }
)

// keyof() {
//     if (!this.basis) {
//         return neverTypeNode
//     }
//     const basisKey = this.basis.keyof()
//     const propsKey = this.getConstraint("props")?.keyof()
//     return propsKey?.or(basisKey) ?? basisKey
// }

export const assertAllowsConstraint = (
    basis: BasisNode | undefined,
    kind: ConstraintKind
) => {
    if (basis?.hasKind("value")) {
        if (kind !== "morph") {
            throwInvalidConstraintError(
                kind,
                "a non-literal type",
                basis.toString()
            )
        }
        return
    }
    const domain = basis?.domain ?? "unknown"
    switch (kind) {
        case "divisor":
            if (domain !== "number") {
                throwParseError(writeIndivisibleMessage(domain))
            }
            return
        case "range":
            if (domain !== "string" && domain !== "number") {
                const hasSizedClassBasis =
                    basis?.hasKind("class") && basis.extendsOneOf(Array, Date)
                if (!hasSizedClassBasis) {
                    throwParseError(writeUnboundableMessage(domain))
                }
            }
            return
        case "regex":
            if (domain !== "string") {
                throwInvalidConstraintError("regex", "a string", domain)
            }
            return
        case "props":
            if (domain !== "object") {
                throwInvalidConstraintError("props", "an object", domain)
            }
            return
        case "narrow":
            return
        case "morph":
            return
        default:
            throwInternalError(`Unexpxected rule kind '${kind}'`)
    }
}

export const writeInvalidConstraintMessage = (
    kind: ConstraintKind,
    typeMustBe: string,
    typeWas: string
) => {
    return `${kind} constraint may only be applied to ${typeMustBe} (was ${typeWas})`
}

export const throwInvalidConstraintError = (
    ...args: Parameters<typeof writeInvalidConstraintMessage>
) => throwParseError(writeInvalidConstraintMessage(...args))

const constraintKindNames = [
    "divisor",
    "range",
    "regex",
    "props",
    "narrow",
    "morph"
] as const satisfies List<ConstraintKind>

export type ListableInputKind = "regex" | "narrow" | "morph"

export type PredicateChildren =
    | [BasisNode, ...ConstraintNode[]]
    | ConstraintNode[]

export type ConstraintNode = ConstraintKinds[ConstraintKind]

type ConstraintKinds = Pick<
    NodeKinds,
    "range" | "divisor" | "regex" | "props" | "narrow" | "morph"
>

export type PredicateChildKind = "basis" | ConstraintKind

export type ConstraintKind = keyof ConstraintKinds

export type PredicateInput<
    basis extends BasisInput | undefined = BasisInput | undefined
> =
    | Record<string, never>
    | evaluate<
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
          | ConstraintKinds[kind]["rule"]
          // Add the unlisted version as a valid input for these kinds
          | (kind extends ListableInputKind
                ? ConstraintKinds[kind]["rule"][number]
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
        ? input["props"] extends PropsInput
            ? inferPropsInput<input["props"]>
            : inferBasis<input["basis"]>
        : unknown

type constraintsOf<basis extends BasisInput> = basis extends Domain
    ? functionalConstraints<inferDomain<basis>> & domainConstraints<basis>
    : basis extends Constructor
    ? functionalConstraints<InstanceType<Constructor>> & classConstraints<basis>
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
          range?: Range
      }
    : basis extends "number"
    ? {
          divisor?: number
          range?: Range
      }
    : {}

type functionalConstraints<input> = {
    narrow?: listable<Narrow<input>>
    morph?: listable<Morph<input>>
}

type classConstraints<base extends Constructor> = base extends typeof Array
    ? {
          props?: PropsInput
          range?: Range
      }
    : {
          props?: PropsInput
      }

export type basisNodeFrom<input extends BasisInput> = input extends Domain
    ? DomainNode
    : input extends AbstractableConstructor
    ? ClassNode
    : ValueNode

export const basisNodeFrom = (
    input: BasisInput
): DomainNode | ClassNode | ValueNode => {
    switch (typeof input) {
        case "string":
            return domainNode(input)
        case "object":
            return valueNode(input[1])
        case "function":
            return classNode(input)
        default:
            return throwInternalError(
                `Unexpectedly got a basis input of type ${domainOf(input)}`
            )
    }
}
