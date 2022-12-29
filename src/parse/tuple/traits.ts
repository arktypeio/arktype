import type { Scope } from "../../scope.ts"
import type { Sources, Targets } from "../../type.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"

export type Traits<t = unknown, scope extends Scope = Scope> = {
    in?: Sources<t, scope>
    out?: Targets<t, scope>
}

export type TraitsTuple = [unknown, ":", unknown]

export type inferTraitsTuple<
    def extends TraitsTuple,
    scope extends Scope
> = inferDefinition<def[0], scope>

export type validateTraitsTuple<
    def extends TraitsTuple,
    scope extends Scope
> = [
    validateDefinition<def[0], scope>,
    ":",
    Traits<inferDefinition<def[0], scope>, scope>
]
