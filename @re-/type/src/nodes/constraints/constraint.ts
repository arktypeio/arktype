import type { Evaluate } from "@re-/tools"
import { Generate } from "../traverse/exports.js"
import type { Check } from "../traverse/exports.js"
import type { BoundConstraint } from "./bounds.js"
import type { ModuloConstraint } from "./modulo.js"
import type { RegexConstraint } from "./regex.js"

export type Constraint = {
    check(state: Check.CheckState): void
}

export class ConstraintGenerationError extends Generate.UngeneratableError {
    constructor(definition: string) {
        super(definition, "Constrained generation is not yet supported.")
    }
}

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
    bound: BoundConstraint
    modulo: ModuloConstraint
    regex: RegexConstraint
}

export type ConstraintName = keyof ConstraintKinds

export type ConstraintToggles = { [K in ConstraintName]?: true }
