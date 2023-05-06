import { writeUnboundableMessage } from "../parse/ast/bound.js"
import { writeIndivisibleMessage } from "../parse/ast/divisor.js"
import type { inferMorphOut, Morph } from "../parse/ast/morph.js"
import { as } from "../parse/definition.js"
import type { Domain } from "../utils/domains.js"
import { throwParseError } from "../utils/errors.js"
import type { constructor, instanceOf } from "../utils/objectKinds.js"
import { constructorExtends, isArray } from "../utils/objectKinds.js"
import { hasKeys } from "../utils/records.js"
import { BasisNode } from "./basis.js"
import type { Basis, inferBasis } from "./basis.js"
import type { CompilationState } from "./compilation.js"
import type { DiscriminantKind } from "./discriminate.js"
import { Disjoint } from "./disjoint.js"
import { DivisibilityNode } from "./divisibility.js"
import { FilterNode } from "./filter.js"
import { MorphNode } from "./morph.js"
import { Node } from "./node.js"
import type { PropsInput } from "./props.js"
import { PropsNode } from "./props.js"
import type { Bounds } from "./range.js"
import { RangeNode } from "./range.js"
import { RegexNode } from "./regex.js"

export class PredicateNode<t = unknown> extends Node<"predicate"> {
    declare [as]: t

    static readonly kind = "predicate"
    basis: BasisNode | undefined
    constraints: ConstraintNode[]

    constructor(rules: PredicateRules) {
        super(PredicateNode, rules)
        this.basis = rules.basis
        this.constraints = rules.constraints
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

    static from<def extends PredicateNodeInput>(def: def) {
        if (!hasKeys(def)) {
            return new PredicateNode({
                basis: undefined,
                constraints: []
            })
        }
        // if (def.range) {
        //     basisNode.domain === "number" ||
        //     basisNode.domain === "string" ||
        //     (basisNode.hasLevel("class") &&
        //         (basisNode.rule instanceof Date ||
        //             basisNode.rule instanceof Array))
        //         ? rules.push(new RangeNode(def.range))
        //         : throwParseError(writeUnboundableMessage(basisNode.domain))
        // }
        //todoshawn extends contructor
        //no value or basis rule
        //otherwise contructor extends
        //value -> constructor of that value
        //undefined if not an object
        const constraints: ConstraintNode[] = []
        const basisNode = new BasisNode(def.basis)
        if (def.divisor) {
            basisNode.domain === "number"
                ? constraints.push(new DivisibilityNode(def.divisor))
                : throwParseError(
                      domainMessage("number", basisNode.domain, "divisor")
                  )
        }
        if (def.range) {
            if (basisNode.domain === "number") {
                constraints.push(new RangeNode(def.range))
            } else if (basisNode.domain === "string") {
                constraints.push(new RangeNode(def.range))
            } else if (
                basisNode.hasLevel("class") &&
                (constructorExtends(Date, basisNode.rule) ||
                    constructorExtends(Object, basisNode.rule))
            ) {
                constraints.push(new RangeNode(def.range))
            } else {
                throwParseError(writeUnboundableMessage(basisNode.domain))
            }
        }
        if (def.regex) {
            basisNode.domain === "string"
                ? constraints.push(new RegexNode(def.regex))
                : domainMessage("string", basisNode.domain, "regex")
        }
        if (def.props) {
            basisNode.domain === "object"
                ? constraints.push(
                      isArray(def.props)
                          ? PropsNode.from(...def.props)
                          : PropsNode.from(def.props)
                  )
                : domainMessage("object", basisNode.domain, "props")
        }
        return new PredicateNode<inferPredicateDefinition<def>>({
            basis: new BasisNode(def.basis),
            constraints
        })
    }

    static compile(rules: PredicateRules) {
        let result = rules.basis?.key ?? ""
        for (const constraint of rules.constraints) {
            // TODO: standardize
            if (constraint.key !== "true") {
                result += `${result && " && "}${constraint.key}`
            }
        }
        return result || "true"
    }

    compileTraverse(s: CompilationState) {
        let result = this.basis?.compileTraverse(s) ?? ""
        for (const constraint of this.constraints) {
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
        // If either predicate is unknown, return opposite operand
        if (!l.basis) {
            return r
        }
        if (!r.basis) {
            return l
        }
        const basisResult = l.basis.intersect(r.basis)
        if (basisResult instanceof Disjoint) {
            return basisResult
        }
        if (l.valueNode) {
            return r.allows(l.valueNode.literalValue)
                ? l
                : Disjoint.from("assignability", l.valueNode, r)
        }
        if (r.valueNode) {
            return l.allows(r.valueNode.literalValue)
                ? r
                : Disjoint.from("assignability", l, r.valueNode)
        }
        const constraints = [...l.constraints]
        for (let i = 0; i < r.constraints.length; i++) {
            const matchingIndex = l.constraints.findIndex(
                (constraint) => constraint.kind === r.constraints[i].kind
            )
            if (matchingIndex === -1) {
                constraints.push(r.constraints[i])
            } else {
                const constraintResult = l.constraints[matchingIndex].intersect(
                    r.constraints[i] as never
                )
                if (constraintResult instanceof Disjoint) {
                    return constraintResult
                }
                constraints[matchingIndex + 1] = constraintResult
            }
        }
        return new PredicateNode({
            basis: basisResult,
            constraints
        })
    }

    constrain<kind extends ConstraintKind>(
        kind: kind,
        input: PredicateNodeInput[kind]
    ) {
        const constraintNode = new constraintKinds[kind](input as any)
        let includedKind = false
        const constraints = this.constraints.map((rule) => {
            if (rule.kind === kind) {
                includedKind = true
                return constraintNode
            }
            return rule
        }) as ConstraintNode[]
        if (!includedKind) {
            // TODO: add precedence
            constraints.push(constraintNode as never)
        }
        return new PredicateNode({
            basis: this.basis,
            constraints
        })
    }

    pruneDiscriminant(
        path: string[],
        kind: DiscriminantKind
    ): PredicateNode | null {
        if (path.length === 0) {
            if (kind === "domain" && this.basis?.hasLevel("value")) {
                // if the basis specifies an exact value but was used to
                // discriminate based on a domain, we can't prune it
                return this
            }
            return this.constraints.length
                ? new PredicateNode({
                      basis: undefined,
                      constraints: this.constraints
                  })
                : null
        }
        const prunedProps = this.getConstraint("props")!.pruneDiscriminant(
            path,
            kind
        )
        const basis = this.basis?.rule === "object" ? undefined : this.basis
        const constraints: ConstraintNode[] = []
        for (const constraint of this.constraints) {
            if (constraint.kind === "props") {
                if (prunedProps) {
                    constraints.push(prunedProps)
                }
            } else {
                constraints.push(constraint)
            }
        }
        if (basis === undefined && constraints.length === 0) {
            return null
        }
        return new PredicateNode({
            basis,
            constraints
        })
    }
}

const domainMessage = (
    expected: string,
    actual: string,
    constraint: string
) => {
    return `Domain must be ${expected} to apply a ${constraint} constraint (was ${actual})`
}

export type PredicateRules = {
    basis: BasisNode | undefined
    constraints: ConstraintNode[]
}

export const constraintKinds = {
    range: RangeNode,
    divisor: DivisibilityNode,
    regex: RegexNode,
    props: PropsNode,
    filter: FilterNode,
    morph: MorphNode
} as const

export type ConstraintsDefinition = Omit<PredicateNodeInput, "basis" | "morphs">

export type ConstraintNode = instanceOf<ConstraintKinds[ConstraintKind]>

type ConstraintKinds = typeof constraintKinds

type ConstraintEntry = {
    [k in ConstraintKind]: [k, instanceOf<ConstraintKinds[k]>]
}[ConstraintKind]

export type ConstraintKind = keyof ConstraintKinds

export type PredicateNodeInput<basis extends Basis = Basis> =
    | Record<string, never>
    | ({
          basis: basis
      } & (Basis extends basis
          ? {
                [k in ConstraintKind]?: k extends "props"
                    ? PropsInput
                    : ConstructorParameters<ConstraintKinds[k]>[0]
            }
          : constraintsOf<basis>))

// TODO: migrate remaining inference
export type inferPredicateDefinition<def extends PredicateNodeInput> =
    def extends Record<string, never>
        ? unknown
        : def["morph"] extends Morph<any, infer out>
        ? (In: inferBasis<def["basis"]>) => inferMorphOut<out>
        : def["morph"] extends [...any[], Morph<any, infer out>]
        ? (In: inferBasis<def["basis"]>) => inferMorphOut<out>
        : inferBasis<def["basis"]>

type constraintsOf<base extends Basis> = base extends Domain
    ? domainConstraints<base>
    : base extends constructor
    ? classConstraints<base>
    : {}

type domainConstraints<base extends Domain> = base extends "object"
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
