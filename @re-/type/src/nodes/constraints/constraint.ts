import { Generate } from "../traverse/exports.js"
import type { Check } from "../traverse/exports.js"

export type Constraint = {
    check(args: Check.CheckArgs): void
}

export class ConstraintGenerationError extends Generate.UngeneratableError {
    constructor(definition: string) {
        super(definition, "Constrained generation is not yet supported.")
    }
}

export type ConstrainedAst<
    Child = unknown,
    Constraints extends unknown[] = unknown[]
> = [Child, Constraints]

export type PossiblyConstrainedAst<
    Child = unknown,
    Constraints extends unknown[] = unknown[]
> = Child | ConstrainedAst<Child, Constraints>
