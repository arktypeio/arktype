import { defineComponent } from "../component.js"
import { BuiltIn } from "."
import { typeDefProxy } from "../../common.js"

export namespace Unextractable {
    export type Definition<
        Def extends UnextractableTypeName = UnextractableTypeName
    > = Def
}

export const unextractable = defineComponent<
    BuiltIn.Definition,
    Unextractable.Definition
>({
    matches: ({ definition }) => definition in unextractableTypes,
    children: []
})

/**
 * These types can be used to specify a type definition but
 * will never be used to represent a value at runtime, either
 * because they are abstract type constructs (e.g. "never") or
 * because a more specific type will always be extracted (e.g.
 * "boolean", which will always evaluate as "true" or "false")
 */
export const unextractableTypes = {
    unknown: typeDefProxy as unknown,
    any: typeDefProxy as any,
    object: typeDefProxy as object,
    boolean: typeDefProxy as boolean,
    void: typeDefProxy as void,
    never: typeDefProxy as never,
    string: typeDefProxy as string,
    number: typeDefProxy as number
}

type UnextractableTypes = typeof unextractableTypes

type UnextractableTypeName = keyof UnextractableTypes
