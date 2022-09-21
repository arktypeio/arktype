import type { Allows } from "../allows.js"
import { Generate } from "../generate.js"

export type ConstraintConstructorArgs = [
    definition: unknown,
    description: string
]

export abstract class Constraint {
    definition: unknown
    description: string

    constructor([definition, description]: ConstraintConstructorArgs) {
        this.definition = definition
        this.description = description
    }

    abstract check(args: Allows.Args): void
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
