import type { Get, KeySet } from "@re-/tools"
import type { parserContext } from "../parser/common.js"
import type {
    Constraint,
    ConstraintKinds,
    ConstraintName,
    ConstraintToggles
} from "./constraints/constraint.js"
import type { Check, References } from "./traverse/exports.js"
import type { TraversalState } from "./traverse/traverse.js"

export namespace Base {
    export type context = parserContext

    export type Input = [node: node, mapper: (data: unknown) => unknown]

    export type UnknownDefinition = string | object

    export type UnknownAst = string | number | object

    export abstract class node<
        AllowConstraints extends ConstraintToggles = {}
    > {
        input?: Input
        constraints: {
            [K in keyof AllowConstraints]?: Get<ConstraintKinds, K>
        } = {}

        protected abstract typecheck(state: Check.CheckState): void
        abstract generate(state: TraversalState): unknown
        /** Mutates collected by adding references as keys */
        abstract collectReferences(
            opts: References.ReferencesOptions,
            collected: KeySet
        ): void

        protected abstract get typeAst(): UnknownAst
        protected abstract get typeStr(): string
        protected abstract get typeDef(): UnknownDefinition

        check(state: Check.CheckState) {
            this.typecheck(state)
        }

        get ast() {
            // Add constraints
            return this.typeAst
        }

        get def() {
            // Add constraints
            return this.typeDef
        }

        toString() {
            // Add constraints
            return this.typeStr
        }

        references(opts: References.ReferencesOptions): string[] {
            const collected = {}
            this.collectReferences(opts, collected)
            return Object.keys(collected)
        }
    }
}
