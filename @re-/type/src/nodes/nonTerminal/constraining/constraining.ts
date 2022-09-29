import type { Evaluate } from "@re-/tools"
import type { Base } from "../../base.js"
import type { Check } from "../../traverse/exports.js"
import type { TraversalState } from "../../traverse/traverse.js"
import { NonTerminal } from "../nonTerminal.js"
import type { Bounds } from "./bounds.js"
import type { Divisibility } from "./divisibility.js"
import { Regex } from "./regex.js"

export namespace Constraining {
    export const token = ":"

    export type Token = typeof token

    export type Constraint = {
        check(state: Check.CheckState): void
        affixToAst(conditionsAst: Base.UnknownAst[]): void
        affixToString(def: string): string
    }

    export type ConstraintKinds = {
        bounds: Bounds.Constraint
        divisibility: Divisibility.Constraint
        regex: Regex.Constraint
    }

    export type Ast<Child, Constraints extends unknown[]> = [
        Child,
        Token,
        Constraints
    ]

    export class Node extends NonTerminal.Node<Token> {
        readonly token = token
        name?: Keyword

        constructor(
            protected child: Base.node,
            private conditions: Constraint[]
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

        addConstraint(constraint: Constraint) {
            this.conditions.push(constraint)
        }

        toAst() {
            return this.affixConstraintsToAst(this.child.toAst())
        }

        private affixConstraintsToAst(base: Base.UnknownAst) {
            const conditionsAst: Base.UnknownAst[] = []
            for (const condition of this.conditions) {
                condition.affixToAst(conditionsAst)
            }
            return [base, this.token, conditionsAst] as const
        }

        toString() {
            return this.affixConstraintsToString(this.child.toString())
        }

        private affixConstraintsToString(base: string) {
            let stringified = base
            for (const condition of this.conditions) {
                stringified = condition.affixToString(stringified)
            }
            return stringified
        }

        toIsomorphicDef() {
            const childDef = this.child.toIsomorphicDef()
            return typeof childDef === "string"
                ? this.affixConstraintsToString(childDef)
                : this.affixConstraintsToAst(childDef)
        }
    }

    export type AffixConstraintsToAst<
        Node,
        Constraints extends unknown[]
    > = Node extends Ast<infer ConstrainedChild, infer ExistingConstraints>
        ? Evaluate<
              [
                  ConstrainedChild,
                  Token,
                  [...ExistingConstraints, ...Constraints]
              ]
          >
        : Evaluate<[Node, Token, Constraints]>

    const keywords = {
        email: new Regex.Constraint(
            /^(.+)@(.+)\.(.+)$/,
            "email",
            "Must be a valid email"
        ),
        alpha: new Regex.Constraint(
            /^[A-Za-z]+$/,
            "alpha",
            "Must include only letters"
        ),
        alphanumeric: new Regex.Constraint(
            /^[\dA-Za-z]+$/,
            "alphanumeric",
            "Must include only letters and digits"
        ),
        lowercase: new Regex.Constraint(
            /^[a-z]*$/,
            "lowercase",
            "Must include only lowercase letters"
        ),
        uppercase: new Regex.Constraint(
            /^[A-Z]*$/,
            "uppercase",
            "Must include only uppercase letters"
        )
    }

    export type Keyword = keyof typeof keywords
}
