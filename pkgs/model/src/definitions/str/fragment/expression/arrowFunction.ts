import {
    typeDefProxy,
    validationError,
    createParser,
    ParseConfig,
    UnknownTypeError
} from "./internal.js"
import { Fragment } from "../fragment.js"
import { Expression } from "./expression.js"

export namespace ArrowFunction {
    export type Definition<
        Args extends string = string,
        Return extends string = string
    > = `(${Args})=>${Return}`

    export type Parse<Def extends Definition, Space> = Def extends Definition<
        infer Args,
        infer Return
    >
        ? {
              args: Fragment.Parse<Args, Space>
              return: Fragment.Parse<Return, Space>
          }
        : UnknownTypeError<Def>

    export type Node = {
        args: Fragment.Node
        return: Fragment.Node
    }

    export type TypeOf<N extends Node, Space, Options extends ParseConfig> = (
        args: Fragment.TypeOf<N["args"], Space, Options>
    ) => Fragment.TypeOf<N["return"], Space, Options>

    // export type Check<
    //     Parameters extends string,
    //     Return extends string,
    //     Root extends string,
    //     Space,
    //     ValidatedParameters extends string = CheckParameterTuple<
    //         Parameters,
    //         Parameters,
    //         Space
    //     > &
    //         string,
    //     ValidatedReturn extends string = Fragment.Check<Return, Return, Space>
    // > = Parameters extends ValidatedParameters
    //     ? Return extends ValidatedReturn
    //         ? Root
    //         : ValidatedReturn
    //     : ValidatedParameters

    // export type Parse<
    //     Parameters extends string,
    //     Return extends string,
    //     Space,
    //     Options extends ParseConfig
    // > = Evaluate<
    //     (
    //         ...args: ParseParameterTuple<Parameters, Space, Options>
    //     ) => Fragment.Parse<Return, Space, Options>
    // >

    export const type = typeDefProxy as Definition

    export const matcher = /^\(.*\)\=\>.*$/

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
                    parameters: parameterDefs.map((arg) =>
                        Fragment.parse(arg, ctx)
                    ),
                    returned: Fragment.parse(returnDef, ctx)
                }
            }
        },
        {
            matches: (def) => matcher.test(def as any),
            allows: ({ def, ctx: { path } }, valueType) =>
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

// type CheckParameterTuple<
//     Def extends string,
//     Root extends string,
//     Space
// > = Def extends "" ? "" : CheckSplittable<",", Def, Root, Space>

// type ParseParameterTuple<
//     Def extends string,
//     Space,
//     Options extends ParseConfig
// > = Def extends "" ? [] : ParseSplittable<",", Def, Space, Options>
