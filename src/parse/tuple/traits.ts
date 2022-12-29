import type { Scope } from "../../scope.ts"
import type { Sources, Targets } from "../../type.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"

export type Traits<t = unknown, s extends Scope = Scope> = {
    in?: Sources<t, s>
    out?: Targets<t, s>
}

export type TraitsTuple = [unknown, ":", unknown]

export type inferTraitsTuple<
    def extends TraitsTuple,
    s extends Scope
> = inferDefinition<def[0], s>

export type validateTraitsTuple<def extends TraitsTuple, s extends Scope> = [
    validateDefinition<def[0], s>,
    ":",
    Traits<inferDefinition<def[0], s>, s>
]
