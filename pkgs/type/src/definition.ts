import { IsAny, NonRecursible, WithDefaults } from "@re-do/utils"
import { Root } from "./components/root.js"
import { TypeSet } from "./typeSet/typeSet.js"

export type ValidateTypeOptions = {}

export type DefaultValidateTypeOptions = {}

export type Validate<
    Def,
    TypeSet,
    ProvidedOptions extends ValidateTypeOptions = {},
    Options extends Required<ValidateTypeOptions> = WithDefaults<
        ValidateTypeOptions,
        ProvidedOptions,
        DefaultValidateTypeOptions
    >
> = IsAny<Def> extends true ? Def : Root.Validate<Def, TypeSet, Options>

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

export type Parse<
    Def,
    Set,
    Options extends ParseTypeOptions = {}
> = IsAny<Def> extends true
    ? Def
    : Root.Parse<
          Def,
          TypeSet.Validate<Set>,
          WithDefaults<ParseTypeOptions, Options, DefaultParseTypeOptions>
      >
