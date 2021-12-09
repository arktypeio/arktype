import { Evaluate } from "@re-do/utils"
import {
    typeDefProxy,
    validationError,
    createParser,
    ParseSplittable,
    ValidateSplittable,
    ParseConfig
} from "./common.js"
import { Fragment } from "./fragment.js"

export namespace ArrowFunction {
    export type Definition<
        Parameters extends string = string,
        Return extends string = string
    > = `(${Parameters})=>${Return}`

    export type Validate<
        Parameters extends string,
        Return extends string,
        Root extends string,
        TypeSet,
        ValidateParameters extends string = ValidateParameterTuple<
            Parameters,
            Parameters,
            TypeSet
        > &
            string,
        ValidateReturn extends string = Fragment.Validate<
            Return,
            Return,
            TypeSet
        >
    > = Parameters extends ValidateParameters
        ? Return extends ValidateReturn
            ? Root
            : ValidateReturn
        : ValidateParameters

    export type Parse<
        Parameters extends string,
        Return extends string,
        TypeSet,
        Options extends ParseConfig
    > = Evaluate<
        (
            ...args: ParseParameterTuple<Parameters, TypeSet, Options>
        ) => Fragment.Parse<Return, TypeSet, Options>
    >

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Fragment.parse as any,
            matches: (def) => /\(.*\)\=\>.*/.test(def as any),
            components: (def, ctx) => {
                const parts = def.split("=>")
                const parameterDefs = parts[0]
                    .slice(1, -1)
                    .split(",")
                    .filter((arg) => !!arg)
                const returnDef = parts.slice(1).join("=>")
                return {
                    parameters: parameterDefs.map((arg) =>
                        Fragment.parse(arg, ctx)
                    ),
                    returned: Fragment.parse(returnDef, ctx)
                }
            }
        },
        {
            allows: ({ def, ctx: { path } }, valueType) =>
                valueType === "function"
                    ? {}
                    : validationError({
                          def,
                          valueType,
                          path
                      }),
            references: (
                { components: { parameters, returned }, ctx },
                opts
            ) => {
                return [
                    ...parameters.flatMap((_) => _.references(opts)),
                    ...returned.references(opts)
                ]
            },
            generate:
                ({ components: { returned } }, opts) =>
                (...args: any[]) =>
                    returned.generate(opts)
        }
    )

    export const delegate = parse as any as Definition
}

type ValidateParameterTuple<
    Def extends string,
    Root extends string,
    TypeSet
> = Def extends "" ? "" : ValidateSplittable<",", Def, Root, TypeSet>

type ParseParameterTuple<
    Def extends string,
    TypeSet,
    Options extends ParseConfig
> = Def extends "" ? [] : ParseSplittable<",", Def, TypeSet, Options>
