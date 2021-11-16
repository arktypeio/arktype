import { Evaluate } from "@re-do/utils"
import { ParseTypeRecurseOptions } from "./common.js"
import {
    ParseSplittable,
    ParseSplittableResult,
    ValidateSplittable
} from "./common.js"
import { Fragment } from "./fragment.js"
import { createParser } from "../parser.js"
import { typeDefProxy } from "../../common.js"
import { validationError } from "../errors.js"

export namespace ArrowFunction {
    export type Definition<
        Parameters extends string = string,
        Return extends string = string
    > = `(${Parameters})=>${Return}`

    export type Validate<
        Parameters extends string,
        Return extends string,
        Root extends string,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean,
        ValidateParameters extends string = ValidateParameterTuple<
            Parameters,
            Parameters,
            DeclaredTypeName,
            ExtractTypesReferenced
        > &
            string,
        ValidateReturn extends string = Fragment.Validate<
            Return,
            Return,
            DeclaredTypeName,
            ExtractTypesReferenced
        >
    > = ExtractTypesReferenced extends true
        ? ValidateParameters | ValidateReturn
        : Parameters extends ValidateParameters
        ? Return extends ValidateReturn
            ? Root
            : ValidateReturn
        : ValidateParameters

    export type Parse<
        Parameters extends string,
        Return extends string,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = Evaluate<
        (
            ...args: ParseParameterTuple<Parameters, TypeSet, Options>
        ) => Fragment.Parse<Return, TypeSet, Options>
    >

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Fragment.parse as any,
        matches: (def) => /\(.*\)\=\>.*/.test(def as any),
        fragments: (def, ctx) => {
            const parts = def.split("=>")
            const parameterDefs = parts[0].slice(1, -1).split(",")
            const returnDef = parts.slice(1).join("=>")
            return {
                parameters: parameterDefs.map((arg) =>
                    Fragment.parse(arg, ctx)
                ),
                returned: Fragment.parse(returnDef, ctx)
            }
        }
    })
    // implements: {}
    // implements: {
    //     allows: ({ def, path }, valueType) =>
    //         valueType === "function"
    //             ? {}
    //             : validationError({
    //                   def,
    //                   valueType,
    //                   path
    //               }),
    //     references: ({ fragments, ctx }, opts) => {
    //         return [
    //             ...fragments.parameters.map((_) => _.references(opts)),
    //             fragments.returned.references(opts)
    //         ]
    //     },
    //     generate: () => {}
    //     // generate: (definition, context, opts) => {
    //     //     const { returns } = parts(definition)
    //     //     return () => Fragment.parse(returns, context).generate(opts)
    //     // }
    // }

    export const delegate = parse as any as Definition
}

type ValidateParameterTuple<
    Def extends string,
    Root extends string,
    DeclaredTypeName extends string,
    ExtractTypesReferenced extends boolean
> = Def extends ""
    ? ExtractTypesReferenced extends true
        ? never
        : ""
    : ValidateSplittable<
          ",",
          Def,
          Root,
          DeclaredTypeName,
          ExtractTypesReferenced
      >

type ParseParameterTuple<
    Def extends string,
    TypeSet,
    Options extends ParseTypeRecurseOptions,
    Result extends ParseSplittableResult = ParseSplittable<
        ",",
        Def,
        TypeSet,
        Options
    >
> = Def extends "" ? [] : Result["Components"]
