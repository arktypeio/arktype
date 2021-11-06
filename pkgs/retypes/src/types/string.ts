// import {
//     transform,
//     ElementOf,
//     TypeError,
//     ListPossibleTypes,
//     Evaluate,
//     StringifyPossibleTypes,
//     MergeAll,
//     DiffUnions,
//     UnionDiffResult,
//     RemoveSpaces,
//     Split,
//     Join,
//     Unlisted,
//     Narrow,
//     WithDefaults
// } from "@re-do/utils"
// import {
//     OrDefinition,
//     ListDefinition,
//     OptionalDefinition,
//     BuiltInTypeName,
//     UnvalidatedObjectDefinition,
//     FunctionDefinition,
//     StringLiteralDefinition,
//     NumericStringLiteralDefinition,
//     BuiltInTypes
// } from "../common.js"
// import {
//     FunctionDefinitionRecurse,
//     StringDefinitionRecurse
// } from "../definitions.js"
// import { DefinitionTypeError, UnknownTypeError } from "../errors.js"
// import {
//     ParseResolvedDefinition,
//     ParseStringDefinitionRecurse,
//     ParseStringFunctionDefinitionRecurse,
//     ParseTypeRecurseOptions
// } from "../parse.js"
// import { Or } from "./or.js"

// export namespace String {
//     export type Definition<Definition extends string = string> = Definition

//     export type Validate<
//         Definition extends string,
//         DeclaredTypeName extends string,
//         ExtractTypesReferenced extends boolean,
//         ParsableDefinition extends string = RemoveSpaces<Definition>
//     > = ValidateRecurse<
//         ParsableDefinition extends OptionalDefinition<infer Optional>
//             ? Optional
//             : ParsableDefinition,
//         Definition,
//         DeclaredTypeName,
//         ExtractTypesReferenced
//     >

//     export type Parse<
//         Fragment extends string,
//         TypeSet,
//         Options extends ParseTypeRecurseOptions
//     > = Fragment extends OrDefinition<infer First, infer Second>
//         ? Or.Parse<First, Second, TypeSet, Options>
//         : Fragment extends FunctionDefinition<infer Parameters, infer Return>
//         ? ParseStringFunctionDefinitionRecurse<
//               Parameters,
//               Return,
//               TypeSet,
//               Options
//           >
//         : Fragment extends ListDefinition<infer ListItem>
//         ? ParseStringDefinitionRecurse<ListItem, TypeSet, Options>[]
//         : Fragment extends StringLiteralDefinition<infer Literal>
//         ? `${Literal}`
//         : Fragment extends NumericStringLiteralDefinition<infer Value>
//         ? // For now this is always inferred as 'number', even if the string is a literal like '5'
//           Value
//         : Fragment extends BuiltInTypeName
//         ? BuiltInTypes[Fragment]
//         : Fragment extends keyof TypeSet
//         ? ParseResolvedDefinition<Fragment, TypeSet, Options>
//         : UnknownTypeError<Fragment>

//     type ValidateRecurse<
//         Fragment extends string,
//         Root extends string,
//         DeclaredTypeName extends string,
//         ExtractTypesReferenced extends boolean
//     > = Fragment extends Or.Definition
//         ? Or.Validate<
//               First,
//               Second,
//               Root,
//               DeclaredTypeName,
//               ExtractTypesReferenced
//           >
//         : Fragment extends FunctionDefinition<infer Parameters, infer Return>
//         ? FunctionDefinitionRecurse<
//               Parameters,
//               Return,
//               Root,
//               DeclaredTypeName,
//               ExtractTypesReferenced
//           >
//         : Fragment extends ListDefinition<infer ListItem>
//         ? StringDefinitionRecurse<
//               ListItem,
//               Root,
//               DeclaredTypeName,
//               ExtractTypesReferenced
//           >
//         : Fragment extends
//               | DeclaredTypeName
//               | BuiltInTypeName
//               | StringLiteralDefinition
//               | NumericStringLiteralDefinition
//         ? ExtractTypesReferenced extends true
//             ? Fragment
//             : Root
//         : UnknownTypeError<Fragment>
// }
export {}
