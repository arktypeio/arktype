import { Evaluate } from "@re-/tools"
import {
    typeDefProxy,
    validationError,
    createParser,
    ParseSplittable,
    CheckSplittable,
    ParseConfig
} from "./internal.js"
import { Fragment } from "../fragment.js"
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
        Space,
        ValidatedParameters extends string = CheckParameterTuple<
            Parameters,
            Parameters,
            Space
        > &
            string,
        ValidatedReturn extends string = Fragment.Check<Return, Return, Space>
    > = Parameters extends ValidatedParameters
        ? Return extends ValidatedReturn
            ? Root
            : ValidatedReturn
        : ValidatedParameters

    export type Parse<
        Parameters extends string,
        Return extends string,
        Space,
        Options extends ParseConfig
    > = Evaluate<
        (
            ...args: ParseParameterTuple<Parameters, Space, Options>
        ) => Fragment.Parse<Return, Space, Options>
    >

    export const type = typeDefProxy as Definition

    export const matcher = /\(.*\)\=\>.*/

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

type CheckParameterTuple<
    Def extends string,
    Root extends string,
    Space
> = Def extends "" ? "" : CheckSplittable<",", Def, Root, Space>

type ParseParameterTuple<
    Def extends string,
    Space,
    Options extends ParseConfig
> = Def extends "" ? [] : ParseSplittable<",", Def, Space, Options>
