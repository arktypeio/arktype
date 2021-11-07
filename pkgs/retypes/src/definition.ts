import { WithDefaults, Evaluate } from "@re-do/utils"
import {
    DefaultParseTypeOptions,
    ParseTypeOptions
} from "./components/common.js"
import { Root } from "./components"

export type Parse<Def, Set, Options extends ParseTypeOptions = {}> = Root.Parse<
    Def,
    Set,
    WithDefaults<ParseTypeOptions, Options, DefaultParseTypeOptions>
>

export type TypeDefinitionOptions = {
    extractTypesReferenced?: boolean
}

export type Validate<
    Def,
    DeclaredTypeName extends string,
    ProvidedOptions extends TypeDefinitionOptions = {},
    Options extends Required<TypeDefinitionOptions> = WithDefaults<
        TypeDefinitionOptions,
        ProvidedOptions,
        { extractTypesReferenced: false }
    >
> = Root.Validate<Def, DeclaredTypeName, Options["extractTypesReferenced"]>
