import type { CompilationContext } from "../../compiler/compile.js"
import { assertAllowsConstraint } from "../../parser/semantic/validate.js"
import { NodeBase } from "../base.js"
import { Disjoint } from "../disjoint.js"
import type { NodeKinds } from "../kinds.js"
import type { BasisKind, BasisNode } from "../primitive/basis.js"
import type { BoundGroup } from "../primitive/bound.js"
import type { DivisorNode } from "../primitive/divisor.js"
import type { NarrowNode } from "../primitive/narrow.js"
import type { RegexNode } from "../primitive/regex.js"
import type { UnitNode } from "../primitive/unit.js"
import type { PropertiesNode } from "../properties/properties.js"
import type { TypeNode } from "../type.js"
import { builtins } from "../union/utils.js"
import type {
    ConstraintInput,
    ConstraintKind,
    PredicateInput
} from "./parse.js"

export type ConstraintIntersections = {
    basis: BasisNode
    bound: BoundGroup
    divisor: DivisorNode
    regex: readonly RegexNode[]
    properties: PropertiesNode
    narrow: readonly NarrowNode[]
}

export type ConstraintGroups = Partial<ConstraintIntersections>

export type Constraint = NodeKinds[ConstraintKind | BasisKind]

// throwParseError(
//     `'${k}' is not a valid constraint name (must be one of ${Object.keys(
//         constraintsByPrecedence
//     ).join(", ")})`
// )

export class PredicateNode
    extends NodeBase
    implements Partial<ConstraintGroups>
{
    readonly kind = "predicate"
    readonly basis?: ConstraintGroups["basis"]
    readonly bound?: ConstraintGroups["bound"]
    readonly divisor?: ConstraintGroups["divisor"]
    readonly regex?: ConstraintGroups["regex"]
    readonly properties?: ConstraintGroups["properties"]
    readonly narrow?: ConstraintGroups["narrow"]
    readonly groups: ConstraintGroups
    readonly children: readonly Constraint[]
    // TODO: update morph representation here
    // we only want simple unmorphed values
    readonly unit: UnitNode | undefined

    constructor(
        input: PredicateInput,
        public readonly meta: {}
    ) {
        super()
        this.groups = {}
        this.children = Object.values(this.groups).flat()
        this.unit =
            this.basis?.hasKind("unit") && this.children.length === 1
                ? this.basis
                : undefined
    }

    readonly references: readonly TypeNode[] = this.properties?.references ?? []

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
        return this
        // const rules: Constraint[] = basis ? [basis] : []
        // for (const kind of constraintKindNames) {
        //     const lNode = this.getConstraints(kind)
        //     const rNode = other.getConstraints(kind)
        //     if (lNode) {
        //         if (rNode) {
        //             // TODO: fix
        //             const result = lNode
        //             // lNode.intersect(rNode as never)
        //             // we may be missing out on deep discriminants here if e.g.
        //             // there is a range Disjoint between two arrays, each of which
        //             // contains objects that are discriminable. if we need to find
        //             // these, we should avoid returning here and instead collect Disjoints
        //             // similarly to in PropsNode
        //             if (result instanceof Disjoint) {
        //                 return result
        //             }
        //             rules.push(result)
        //         } else {
        //             rules.push(lNode)
        //         }
        //     } else if (rNode) {
        //         rules.push(rNode)
        //     }
        // }
        // // TODO: bad context source
        // return new PredicateNode(rules, this.meta)
    }

    compile(ctx: CompilationContext) {
        return ""
        // // TODO: can props imply object basis for compilation?
        // let result = ""
        // this.basis && ctx.bases.push(this.basis)
        // for (const child of children) {
        //     const childResult = child.hasKind("props")
        //         ? child.compile(ctx)
        //         : compileCheck(
        //               // TODO: fix
        //               child.kind === "narrow" ? "custom" : child.kind,
        //               child.rule,
        //               child.compile(ctx),
        //               ctx
        //           )
        //     if (childResult) {
        //         result = result ? `${result}\n${childResult}` : childResult
        //     }
        // }
        // this.basis && ctx.bases.pop()
        // return result
    }

    describe() {
        return this.children.length === 0
            ? "unknown"
            : this.children.length === 1
            ? `${this.basis}`
            : `(${this.children
                  .map((child) => child.toString())
                  .join(" and ")})`
    }

    keyof(): TypeNode {
        if (!this.basis) {
            return builtins.never()
        }
        const propsKey = this.properties?.keyof()
        return propsKey?.or(this.basis.keyof()) ?? this.basis.keyof()
    }

    constrain<kind extends ConstraintKind>(
        kind: kind,
        input: ConstraintInput<kind>
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

export const constraintsByPrecedence: Record<ConstraintKind, number> = {
    // basis
    basis: 0,
    // shallow
    bound: 1,
    divisor: 1,
    regex: 1,
    // deep
    properties: 2,
    // narrow
    narrow: 3
}
