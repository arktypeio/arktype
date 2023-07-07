import type { CompilationContext } from "../../compiler/compile.js"
import { assertAllowsConstraint } from "../../parser/semantic/validate.js"
import { NodeBase } from "../base.js"
import { Disjoint } from "../disjoint.js"
import type { BasisNode } from "../primitive/basis.js"
import type { BoundNode } from "../primitive/bound.js"
import type { DivisorNode } from "../primitive/divisor.js"
import type { NarrowNode } from "../primitive/narrow.js"
import type { RegexNode } from "../primitive/regex.js"
import type { PropertiesNode } from "../properties/properties.js"
import type { TypeNode } from "../type.js"
import { builtins } from "../union/utils.js"
import type { ConstraintsInput } from "./parse.js"

export type Constraints = {
    readonly basis?: BasisNode
    readonly bound?: readonly BoundNode[]
    readonly divisor?: DivisorNode
    readonly regex?: readonly RegexNode[]
    readonly properties?: PropertiesNode
    readonly narrow?: readonly NarrowNode[]
}

export type Constraint<kind extends ConstraintKind = ConstraintKind> =
    Constraints[kind] & {}

export type ConstraintKind = keyof Constraints

export class PredicateNode extends NodeBase implements Constraints {
    readonly kind = "predicate"
    readonly basis?: Constraint<"basis">
    readonly bound?: Constraint<"bound">
    readonly divisor?: Constraint<"divisor">
    readonly regex?: Constraint<"regex">
    readonly properties?: Constraint<"properties">
    readonly narrow?: Constraint<"narrow">

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
