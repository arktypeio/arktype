import type { Dict, NonEmptyList } from "../../utils/generics.js"
import type { inferDefinition, validateDefinition } from "../definition.js"
import type { distributable } from "./utils.js"

export type Pipe<T> = (In: T) => T

export type validatePipeTuple<
    pipedDef,
    scope extends Dict,
    input extends boolean
> = [
    validateDefinition<pipedDef, scope, input>,
    "|>",
    ...NonEmptyList<
        distributable<Pipe<inferDefinition<pipedDef, scope, scope, input>>>
    >
]
