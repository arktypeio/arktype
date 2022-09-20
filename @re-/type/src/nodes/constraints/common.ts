import { Generate } from "../generate.js"

// TODO: Come up with a better way to organize constraints, since most will only apply to one node
export type Constrained<
    Child = unknown,
    Constraints extends unknown[] = unknown[]
> = [Child, Constraints]

export type PossiblyConstrained<
    Child = unknown,
    Constraints extends unknown[] = unknown[]
> = Child | Constrained<Child, Constraints>

export class ConstraintGenerationError extends Generate.UngeneratableError {
    constructor(definition: string) {
        super(definition, "Constrained generation is not yet supported.")
    }
}
