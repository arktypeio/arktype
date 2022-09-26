import { Evaluate } from "@re-/tools"
import { Create } from "../traversal/create.js"

export type Constrained<
    Child = unknown,
    Constraints extends unknown[] = unknown[]
> = [Child, Constraints]

export type PossiblyConstrained<
    Child = unknown,
    Constraints extends unknown[] = unknown[]
> = Child | Constrained<Child, Constraints>

export type AddConstraints<
    Child,
    Constraints extends unknown[]
> = Child extends Constrained<infer Node, infer ExistingConstraints>
    ? Evaluate<[Node, [...ExistingConstraints, ...Constraints]]>
    : Evaluate<[Child, Constraints]>

export class ConstraintGenerationError extends Create.UngeneratableError {
    constructor(definition: string) {
        super(definition, "Constrained generation is not yet supported.")
    }
}
