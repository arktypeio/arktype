import { Evaluate } from "@re-/tools"
import {
    typeDefProxy,
    validationError,
    createParser,
    ParseSplittable,
    CheckSplittable,
    ParseConfig
} from "./internal.js"
import { Str } from "../str.js"
import { Expression } from "./expression.js"

export namespace ArrowFunction {
    export type Definition<
        Parameters extends string = string,
        Return extends string = string
    > = `(${Parameters})=>${Return}`

    export type Check<
        Parameters extends string,
        Return extends string,
        Root extends string,
        Typespace,
        ValidatedParameters extends string = CheckParameterTuple<
            Parameters,
            Parameters,
            Typespace
        > &
            string,
        ValidatedReturn extends string = Str.Check<Return, Return, Typespace>
    > = Parameters extends ValidatedParameters
        ? Return extends ValidatedReturn
            ? Root
            : ValidatedReturn
        : ValidatedParameters

    export type Parse<
        Parameters extends string,
        Return extends string,
        Typespace,
        Options extends ParseConfig
    > = Evaluate<
        (
            ...args: ParseParameterTuple<Parameters, Typespace, Options>
        ) => Str.Parse<Return, Typespace, Options>
    >

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Expression.parse,
            components: (def, ctx) => {
                const parts = def.split("=>")
                const parameterDefs = parts[0]
                    .slice(1, -1)
                    .split(",")
                    .filter((arg) => !!arg)
                const returnDef = parts.slice(1).join("=>")
                return {
                    parameters: parameterDefs.map((arg) => Str.parse(arg, ctx)),
                    returned: Str.parse(returnDef, ctx)
                }
            }
        },
        {
            matches: (def) => /\(.*\)\=\>.*/.test(def as any),
            validate: ({ def, ctx: { path } }, valueType) =>
                valueType === "function"
                    ? {}
                    : validationError({
                          def,
                          valueType,
                          path
                      }),
            generate:
                ({ components: { returned } }, opts) =>
                (...args: any[]) =>
                    returned.generate(opts)
        }
    )

    export const delegate = parse as any as Definition
}

type CheckParameterTuple<
    Def extends string,
    Root extends string,
    Typespace
> = Def extends "" ? "" : CheckSplittable<",", Def, Root, Typespace>

type ParseParameterTuple<
    Def extends string,
    Typespace,
    Options extends ParseConfig
> = Def extends "" ? [] : ParseSplittable<",", Def, Typespace, Options>
