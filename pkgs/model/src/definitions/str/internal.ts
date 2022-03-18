import { StringifyPossibleTypes, Split, Join, Iteration } from "@re-/tools"
import { ParseConfig, ValidationErrorMessage } from "../internal.js"
import { Fragment } from "./fragment/fragment.js"

export * from "../internal.js"

// export type CheckSplittable<
//     Delimiter extends string,
//     Def extends string,
//     Root extends string,
//     Space,
//     Components extends string[] = Split<Def, Delimiter>,
//     ValidateDefinitions extends string[] = {
//         [Index in keyof Components]: Fragment.Check<
//             Components[Index] & string,
//             Components[Index] & string,
//             Space
//         >
//     },
//     ValidatedDefinition extends string = Join<ValidateDefinitions, Delimiter>
// > = Def extends ValidatedDefinition
//     ? Root
//     : StringifyPossibleTypes<
//           Extract<
//               ValidateDefinitions[keyof ValidateDefinitions],
//               ValidationErrorMessage
//           >
//       >

// export type ParseSplittable<
//     Delimiter extends string,
//     Def extends string,
//     Space,
//     Options extends ParseConfig,
//     Components extends string[] = Split<Def, Delimiter>
// > = {
//     [I in keyof Components]: Fragment.Parse<
//         Components[I] & string,
//         Space,
//         Options
//     >
// }

type ModifierTokens = ["?"]

type AvailableModifierStrings<
    Tokens extends string[],
    Result extends string = ""
> = Tokens extends Iteration<string, infer Token, infer Remaining>
    ? Remaining extends []
        ? `${Result}${Token | ""}`
        : `${Result}${Token | ""}${AvailableModifierStrings<Remaining>}`
    : never

export type ModifierString = Exclude<
    AvailableModifierStrings<ModifierTokens>,
    ""
>
