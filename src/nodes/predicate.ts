import { writeUnboundableMessage } from "../parse/ast/bound.js"
import { writeIndivisibleMessage } from "../parse/ast/divisor.js"
import type { inferMorphOut, Morph, Out } from "../parse/ast/morph.js"
import type { GuardedNarrow, Narrow } from "../parse/ast/narrow.js"
import type { Domain, inferDomain } from "../utils/domains.js"
import { throwInternalError, throwParseError } from "../utils/errors.js"
import type { evaluate, isUnknown } from "../utils/generics.js"
import type { List, listable } from "../utils/lists.js"
import type { Constructor, instanceOf } from "../utils/objectKinds.js"
import { isArray } from "../utils/objectKinds.js"
import { isKeyOf, type keySet } from "../utils/records.js"
import type { BasisInput, BasisInstance, inferBasis } from "./basis/basis.js"
import { ClassNode } from "./basis/class.js"
import { basisNodeFrom } from "./basis/from.js"
import { ValueNode } from "./basis/value.js"
import type { CompilationState } from "./compilation.js"
import { DivisorNode } from "./constraints/divisor.js"
import { MorphNode } from "./constraints/morph.js"
import { NarrowNode } from "./constraints/narrow.js"
import type { inferPropsInput } from "./constraints/props/infer.js"
import type {
    NamedPropsInput,
    PropsInput,
    PropsInputTuple
} from "./constraints/props/props.js"
import { emptyPropsNode, PropsNode } from "./constraints/props/props.js"
import type { Range } from "./constraints/range.js"
import { RangeNode } from "./constraints/range.js"
import { RegexNode } from "./constraints/regex.js"
import type { DiscriminantKind } from "./discriminate.js"
import { Disjoint } from "./disjoint.js"
import { BaseNode } from "./node.js"

export class PredicateNode extends BaseNode<"predicate"> {
    constructor(public rule: PredicateRules) {
        const subconditions: string[] = []
        for (const r of rule) {
            if (r.condition !== "true") {
                subconditions.push(r.condition)
            }
        }
        const condition = subconditions.join(" && ") || "true"
        if (BaseNode.nodes.predicate[condition]) {
            return BaseNode.nodes.predicate[condition]
        }
        super("predicate", condition)
    }

    basis = this.rule[0]?.kind === "basis" ? this.rule[0] : undefined

    constraints = (this.rule[0]?.kind === "basis"
        ? this.rule.slice(1)
        : this.rule) as ConstraintNode[]

    static from<const input extends PredicateInput>(input: input) {
        const basis = input.basis && basisNodeFrom(input.basis)
        const rules: PredicateRules = basis ? [basis] : []
        for (const kind of constraintsByPrecedence) {
            if (input[kind]) {
                assertAllowsConstraint(basis, kind)
                rules.push(createConstraint(kind, input[kind]))
            }
        }
        return new PredicateNode(rules)
    }

    getConstraint<k extends ConstraintKind>(k: k) {
        return this.rule.find((constraint) => constraint.kind === k) as
            | instanceOf<ConstraintKinds[k]>
            | undefined
    }

    toString() {
        return this.rule.length === 0
            ? "unknown"
            : this.rule.map((rule) => rule.toString()).join(" and ")
    }

    compileTraverse(s: CompilationState) {
        // let result = this.basis?.compileTraverse(s) ?? ""
        // for (const constraint of this.rule) {
        //     result += "\n" + constraint.compileTraverse(s)
        // }
        return "true" //result
    }

    get valueNode(): ValueNode | undefined {
        return this.basis instanceof ValueNode ? this.basis : undefined
    }

    computeIntersection(r: PredicateNode): PredicateNode | Disjoint {
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
            return r.allows(this.valueNode.rule)
                ? this
                : Disjoint.from("assignability", this.valueNode, r)
        }
        if (r.valueNode) {
            return this.allows(r.valueNode.rule)
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
        return new PredicateNode(rules)
    }

    constrain<kind extends ConstraintKind>(
        kind: kind,
        input: ConstraintsInput[kind]
    ): PredicateNode {
        assertAllowsConstraint(this.basis, kind)
        const result = this.intersect(
            new PredicateNode([createConstraint(kind, input)])
        )
        if (result instanceof Disjoint) {
            return result.throw()
        }
        return result
    }

    pruneDiscriminant(path: string[], kind: DiscriminantKind): PredicateNode {
        if (path.length === 0) {
            if (kind === "domain" && this.basis instanceof ValueNode) {
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
        for (const rule of this.rule) {
            if (rule.kind === "basis") {
                if (rule.level !== "domain" || rule.domain !== "object") {
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

    // private _keyof?: TypeNode
    // keyof() {
    //     if (this._keyof) {
    //         return this._keyof
    //     }
    //     if (!this.basis) {
    //         return neverTypeNode
    //     }
    //     const basisKey = this.basis.keyof()
    //     const propsKey = this.getConstraint("props")?.keyof()
    //     this._keyof = propsKey?.or(basisKey) ?? basisKey
    //     return this._keyof
    // }
}

export const assertAllowsConstraint = (
    basis: BasisInstance | undefined,
    kind: ConstraintKind
) => {
    if (basis instanceof ValueNode) {
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
                    basis instanceof ClassNode &&
                    basis.extendsOneOf(Array, Date)
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
    morph: true
} satisfies keySet<ConstraintKind>

type ListableInputKind = keyof typeof listableInputKinds

export const unknownPredicateNode = new PredicateNode([])

export type PredicateRules =
    | [BasisInstance, ...ConstraintNode[]]
    | ConstraintNode[]

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
          | ConstructorParameters<ConstraintKinds[kind]>[0]
          // Add the unlisted version as a valid input for these kinds
          | (kind extends ListableInputKind
                ? ConstructorParameters<ConstraintKinds[kind]>[0][number]
                : never)

export type inferPredicateDefinition<input extends PredicateInput> =
    input["morph"] extends Morph<any, infer out>
        ? (In: inferPredicateInput<input>) => Out<inferMorphOut<out>>
        : input["morph"] extends readonly [...any[], Morph<any, infer out>]
        ? (In: inferPredicateInput<input>) => Out<inferMorphOut<out>>
        : inferPredicateInput<input>

type inferPredicateInput<input extends PredicateInput> =
    input["narrow"] extends GuardedNarrow<any, infer narrowed>
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
              (head extends GuardedNarrow<any, infer narrowed>
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
