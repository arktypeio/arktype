import { WithDefaults } from "@re-do/utils"
import { Root } from "./components/root.js"

export type ValidateTypeOptions = {
    extractTypesReferenced?: boolean
    includeBuiltIn?: boolean
    shallowSeen?: Record<string, boolean>
}

export type DefaultValidateTypeOptions = {
    extractTypesReferenced: false
    includeBuiltIn: false
    shallowSeen: {}
}

export type Validate<
    Def,
    TypeSet,
    ProvidedOptions extends ValidateTypeOptions = {},
    Options extends Required<ValidateTypeOptions> = WithDefaults<
        ValidateTypeOptions,
        ProvidedOptions,
        DefaultValidateTypeOptions
    >
> = Root.Validate<Def, TypeSet, Options>

export type ParseTypeOptions = {
    onCycle?: Root.Definition
    seen?: Record<string, boolean>
    deepOnCycle?: boolean
    onResolve?: Root.Definition
}

export type DefaultParseTypeOptions = {
    onCycle: never
    seen: {}
    deepOnCycle: false
    onResolve: never
}

export type Parse<Def, Set, Options extends ParseTypeOptions = {}> = Root.Parse<
    Def,
    Set,
    WithDefaults<ParseTypeOptions, Options, DefaultParseTypeOptions>
>
