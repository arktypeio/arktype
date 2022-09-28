import type { Evaluate } from "@re-/tools"
import type { Base } from "../../base.js"
import type { Check } from "../../traverse/exports.js"
import type { TraversalState } from "../../traverse/traverse.js"
import { NonTerminal } from "../nonTerminal.js"
import type { Bounds } from "./bounds.js"
import type { Divisibility } from "./divisibility.js"
import type { Regex } from "./regex.js"

export namespace Narrowing {
    export const token = ":"

    export type Token = typeof token

    export type Condition = {
        check(state: Check.CheckState): void
        affixToAst(conditionsAst: Base.UnknownAst[]): void
        affixToString(def: string): string
    }

    export type ConditionKinds = {
        bounds: Bounds.Condition
        divisibility: Divisibility.Condition
        regex: Regex.Condition
    }

    export type Ast<Child, Conditions extends unknown[]> = [
        Child,
        Token,
        Conditions
    ]

    export class Node extends NonTerminal.Node<Token> {
        readonly token = token

        constructor(
            protected child: Base.node,
            private conditions: Condition[]
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

        addCondition(condition: Condition) {
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

        toIsomorphicDef() {
            const childDef = this.child.toIsomorphicDef()
            return typeof childDef === "string"
                ? this.affixConditionsToString(childDef)
                : this.affixConditionsToAst(childDef)
        }

        private affixConditionsToString(base: string) {
            let stringified = base
            for (const condition of this.conditions) {
                stringified = condition.affixToString(stringified)
            }
            return stringified
        }
    }

    export type AffixConditionsToAst<
        Node,
        Conditions extends unknown[]
    > = Node extends Ast<infer ConstrainedChild, infer ExistingConditions>
        ? Evaluate<
              [ConstrainedChild, Token, [...ExistingConditions, ...Conditions]]
          >
        : Evaluate<[Node, Token, Conditions]>
}
