import { StringifyPossibleTypes, Split, Join } from "@re-/tools"
import { ParseConfig, ValidationErrorMessage } from "../internal.js"
import { Fragment } from "./fragment.js"

export * from "../internal.js"

export const createTokenMatcher = (tokens: string[]) =>
    RegExp(
        // All non-identifying tokens need to be escaped in a regex expression
        tokens.map((char) => `\\${char}`).join("|"),
        "g"
    )

export type CheckSplittable<
    Delimiter extends string,
    Def extends string,
    Root extends string,
    Space,
    Components extends string[] = Split<Def, Delimiter>,
    ValidateDefinitions extends string[] = {
        [Index in keyof Components]: Fragment.Check<
            Components[Index] & string,
            Components[Index] & string,
            Space
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

export type ParseSplittable<
    Delimiter extends string,
    Def extends string,
    Space,
    Options extends ParseConfig,
    Components extends string[] = Split<Def, Delimiter>
> = {
    [I in keyof Components]: Fragment.Parse<
        Components[I] & string,
        Space,
        Options
    >
}
