import { Evaluate } from "@re-do/utils"
import { ParseTypeRecurseOptions } from "./common.js"
import {
    ParseSplittable,
    ParseSplittableResult,
    ValidateSplittable
} from "./common.js"
import { fragmentDef, Fragment } from "."
import { createNode, NodeInput, createNode } from "../parser.js"

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
}

export const arrowFunctionDef = createNode({
    type: {} as ArrowFunction.Definition,
    parent: fragmentDef,
    matches: ({ definition }) => /\(.*\)\=\>.*/.test(definition)
})

export const arrowFunction = createNode(arrowFunctionDef)
