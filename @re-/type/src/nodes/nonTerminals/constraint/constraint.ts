import type { Evaluate } from "@re-/tools"
import type { Base } from "../../base.js"
import type { Check } from "../../traverse/exports.js"
import type { TraversalState } from "../../traverse/traverse.js"
import { NonTerminalNode } from "../nonTerminal.js"
import type { Bounds } from "./bounds.js"
import type { Divisibility } from "./modulo.js"
import type { Regex } from "./regex.js"

// TODO: Finalize constraint token
export type ConstrainedAst<
    Child = unknown,
    Constraints extends unknown[] = unknown[]
> = Evaluate<[Child, ":", Constraints]>

export type PossiblyConstrainedAst<
    Child = unknown,
    Constraints extends unknown[] = unknown[]
> = Child | ConstrainedAst<Child, Constraints>

export type AddConstraints<
    Child,
    Constraints extends unknown[]
> = Child extends ConstrainedAst<infer Node, infer ExistingConstraints>
    ? Evaluate<[Node, ":", [...ExistingConstraints, ...Constraints]]>
    : Evaluate<[Child, ":", Constraints]>

export type ConstraintKinds = {
    bounds: Bounds.Condition
    divisibility: Divisibility.Condition
    regex: Regex.Condition
}

export type BaseCondition = {
    check(state: Check.CheckState): void
    affixToAst(conditionsAst: Base.UnknownAst[]): void
    affixToString(def: string): string
}

export class ConstraintNode extends NonTerminalNode<":"> {
    readonly token = ":"

    constructor(
        protected child: Base.node,
        private conditions: BaseCondition[]
    ) {
        super([child])
    }

    check(state: Check.CheckState<unknown>) {
        // TODO: Figure out what to do if data isn't the correct type. Who handles?
        for (const condition of this.conditions) {
            condition.check(state)
        }
    }

    generate(state: TraversalState) {
        return this.child.generate(state)
    }

    addCondition(condition: BaseCondition) {
        this.conditions.push(condition)
    }

    toAst() {
        return this.affixConditionsToAst(this.child.toAst())
    }

    private affixConditionsToAst(base: Base.UnknownAst) {
        const conditionsAst: Base.UnknownAst[] = []
        for (const condition of this.conditions) {
            condition.affixToAst(conditionsAst)
        }
        return [base, this.token, conditionsAst] as const
    }

    toString() {
        return this.affixConditionsToString(this.child.toString())
    }

    private affixConditionsToString(base: string) {
        let stringified = base
        for (const condition of this.conditions) {
            stringified = condition.affixToString(stringified)
        }
        return stringified
    }

    toIsomorphicDef() {
        const childDef = this.child.toIsomorphicDef()
        return typeof childDef === "string"
            ? this.affixConditionsToString(childDef)
            : this.affixConditionsToAst(childDef)
    }
}
