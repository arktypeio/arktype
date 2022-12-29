import type { Identifier } from "../../nodes/node.ts"
import type { aliasOf, Scope } from "../../scope.ts"
import type { inferDefinition, validateDefinition } from "../definition.ts"

export type Traits<t = unknown, s extends Scope = Scope> = {
    in?: Sources<t, s>
    out?: Targets<t, s>
}

export type Sources<t = unknown, s extends Scope = Scope> = {
    [name in Identifier<aliasOf<s>>]?: (
        data: inferDefinition<name, s>,
        // rest args typed as never so they can't be used unless explicitly typed
        ...rest: never[]
    ) => t
}

export type Targets<t = unknown, s extends Scope = Scope> = {
    [name in Identifier<aliasOf<s>>]?: (
        data: t,
        ...rest: never[]
    ) => inferDefinition<name, s>
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
