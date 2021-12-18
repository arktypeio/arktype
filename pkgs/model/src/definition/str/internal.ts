import { StringifyPossibleTypes, Split, Join } from "@re-/tools"
import { ParseConfig, ValidationErrorMessage } from "../internal.js"
import { Str } from "./str.js"

export * from "../internal.js"

export type ParseSplittableResult<
    Components = any[],
    Errors extends string = string
> = {
    Components: Components extends any[] ? Components : [Components]
    Errors: Errors
}

export type ParseSplittable<
    Delimiter extends string,
    Def extends string,
    Typespace,
    Options extends ParseConfig,
    Components extends string[] = Split<Def, Delimiter>
> = {
    [I in keyof Components]: Str.Parse<
        Components[I] & string,
        Typespace,
        Options
    >
}

export type ValidateSplittable<
    Delimiter extends string,
    Def extends string,
    Root extends string,
    Typespace,
    Components extends string[] = Split<Def, Delimiter>,
    ValidateDefinitions extends string[] = {
        [Index in keyof Components]: Str.Validate<
            Components[Index] & string,
            Components[Index] & string,
            Typespace
        >
    },
    ValidatedDefinition extends string = Join<ValidateDefinitions, Delimiter>
> = Def extends ValidatedDefinition
    ? Root
    : StringifyPossibleTypes<
          Extract<
              ValidateDefinitions[keyof ValidateDefinitions],
              ValidationErrorMessage
          >
      >
