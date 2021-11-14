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

    const parseArrowFunction = (definition: Definition) => {
        const parts = definition.split("=>")
        const parameters = parts[0].slice(1, -1).split(",")
        const returns = parts.slice(1).join("=>")
        return {
            parameters,
            returns
        }
    }

    export const parse = createParser({
        type,
        parent: () => Fragment.parse,
        matches: ({ definition }) => /\(.*\)\=\>.*/.test(definition),
        implements: {
            allows: (args) =>
                args.assignment === "function" ? {} : validationError(args),
            references: (args): any => {
                const { parameters, returns } = parseArrowFunction(
                    args.definition
                )
                return [
                    ...parameters.flatMap((parameter) =>
                        Fragment.parse({
                            ...args,
                            definition: parameter
                        }).references(args)
                    ),
                    ...Fragment.parse({
                        ...args,
                        definition: returns
                    }).references(args)
                ]
            },
            getDefault: (args) => {
                const { returns } = parseArrowFunction(args.definition)
                return Fragment.parse({
                    ...args,
                    definition: returns
                }).getDefault(args)
            }
        }
    })
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
