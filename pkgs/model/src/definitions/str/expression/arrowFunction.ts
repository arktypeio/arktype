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
import { Fragment } from "../fragment.js"
import { Expression } from "./expression.js"
import { typeOf } from "../../../utils.js"
import { DeepNode } from "../internal.js"

export namespace ArrowFunction {
    export type Definition<
        Args extends string = string,
        Return extends string = string
    > = `(${Args})=>${Return}`

    export type Parse<Def, Resolutions, Context> = Def extends Definition<
        infer Args,
        infer Return
    >
        ? DeepNode<
              Kind,
              {
                  args: Args extends ""
                      ? []
                      : ToList<
                            Fragment.Parse<
                                Args,
                                Resolutions,
                                WithPropValue<
                                    Context,
                                    "delimiter",
                                    Get<Context, "delimiter"> | ","
                                >
                            >
                        >
                  returns: Fragment.Parse<Return, Resolutions, Context>
              }
          >
        : Defer

    export type Kind = "arrowFunction"

    export type Node = DeepNode<
        Kind,
        {
            args: any[]
            returns: any
        }
    >

    export type TypeOf<
        N extends Node,
        Resolutions,
        Options,
        Args = N["children"]["args"]
    > = EvaluateFunction<
        (
            // @ts-ignore
            ...args: TypeOfArgs<Args, Resolutions, Options>
        ) => Root.TypeOf<N["children"]["returns"], Resolutions, Options>
    >

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
                        Fragment.parser.parse(arg, ctx)
                    ),
                    returns: Fragment.parser.parse(returnDef, ctx)
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
