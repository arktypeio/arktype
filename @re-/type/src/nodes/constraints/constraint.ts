import type { Evaluate } from "@re-/tools"
import { Generate } from "../traverse/exports.js"
import type { Check } from "../traverse/exports.js"

export type Constraint = {
    check(state: Check.CheckState): void
}

export class ConstraintGenerationError extends Generate.UngeneratableError {
    constructor(definition: string) {
        super(definition, "Constrained generation is not yet supported.")
    }
}

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
