import { defineComponent, ComponentDefinitionInput } from "../component.js"
import {
    Fragment,
    Extractable,
    Unextractable,
    extractableTypes,
    unextractableTypes,
    fragment
} from "."

export namespace BuiltIn {
    export type Definition<Def extends BuiltInTypeName = BuiltInTypeName> = Def

    export type Parse<Def extends Definition> = BuiltInTypes[Def]
}

export const builtIn = defineComponent({
    name: "builtIn",
    parent: fragment,
    matches: (args) => args.definition in builtInTypes,
    children: []
})

export const builtInTypes = {
    ...extractableTypes,
    ...unextractableTypes
}

type BuiltInTypes = typeof builtInTypes

type BuiltInTypeName = keyof BuiltInTypes
