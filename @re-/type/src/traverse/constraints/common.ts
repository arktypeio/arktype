import { Create } from "../create.js"

export type Constrained<
    Child = unknown,
    Constraints extends unknown[] = unknown[]
> = [Child, Constraints]

export type PossiblyConstrained<
    Child = unknown,
    Constraints extends unknown[] = unknown[]
> = Child | Constrained<Child, Constraints>

export class ConstraintGenerationError extends Create.UngeneratableError {
    constructor(definition: string) {
        super(definition, "Constrained generation is not yet supported.")
    }
}
