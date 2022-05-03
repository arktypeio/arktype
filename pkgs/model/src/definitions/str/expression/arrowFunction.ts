import {
    Evaluate,
    WithPropValue,
    ToList,
    Get,
    EvaluateFunction
} from "@re-/tools"
import {
    typeDefProxy,
    validationError,
    createParser,
    ungeneratableError,
    Defer,
    Root
} from "./internal.js"
import { Str } from "../str.js"
import { Expression } from "./expression.js"
import { typeOf } from "../../../utils.js"
import { DeepNode } from "../internal.js"

export namespace ArrowFunction {
    export type Definition<
        Args extends string = string,
        Return extends string = string
    > = `(${Args})=>${Return}`

    export type Kind = "arrowFunction"

    export type Parse<Def, Resolutions, Context> = Def extends Definition<
        infer Args,
        infer Return
    >
        ? DeepNode<
              Def,
              Kind,
              [
                  Str.Parse<Return, Resolutions, Context>,
                  ...(Args extends ""
                      ? []
                      : ToList<
                            Str.Parse<
                                Args,
                                Resolutions,
                                WithPropValue<
                                    Context,
                                    "delimiter",
                                    Get<Context, "delimiter"> | ","
                                >
                            >
                        >)
              ]
          >
        : Defer

    export type TypeOf<
        N,
        Resolutions,
        Options,
        Children = Get<N, "children">
    > = Children extends [infer Return, ...infer Args]
        ? EvaluateFunction<
              (
                  // @ts-ignore
                  ...args: TypeOfArgs<Args, Resolutions, Options>
              ) => Root.TypeOf<Return, Resolutions, Options>
          >
        : unknown

    type TypeOfArgs<Args, Resolutions, Options> = Evaluate<{
        [I in keyof Args]: Root.TypeOf<Args[I], Resolutions, Options>
    }>

    export const type = typeDefProxy as Definition

    export const matcher = /^\(.*\)\=\>.*$/

    export const parser = createParser(
        {
            type,
            parent: () => Expression.parser,
            components: (def, ctx) => {
                const parts = def.split("=>")
                const parameterDefs = parts[0]
                    .slice(1, -1)
                    .split(",")
                    .filter((arg) => !!arg)
                const returnDef = parts.slice(1).join("=>")
                return {
                    args: parameterDefs.map((arg) =>
                        Str.parser.parse(arg, ctx)
                    ),
                    returns: Str.parser.parse(returnDef, ctx)
                }
            }
        },
        {
            matches: (def) => matcher.test(def as any),
            validate: ({ def, ctx: { path } }, value) => {
                const valueType = typeOf(value)
                return valueType === "function"
                    ? {}
                    : validationError({
                          def,
                          valueType,
                          path
                      })
            },
            generate: ({ def }) => {
                throw new Error(ungeneratableError(def, "arrow function"))
            },
            references: ({ components: { returns, args } }) => [
                ...args.flatMap((arg) => arg.references()),
                ...returns.references()
            ]
        }
    )

    export const delegate = parser as any as Definition
}
