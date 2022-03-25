import { Evaluate, WithPropValue, ToList } from "@re-/tools"
import {
    typeDefProxy,
    validationError,
    createParser,
    ParseConfig,
    UnknownTypeError,
    ParseTypeContext
} from "./internal.js"
import { Fragment } from "../fragment.js"
import { Expression } from "./expression.js"
import { ungeneratableError } from "../internal.js"

export namespace ArrowFunction {
    export type Definition<
        Args extends string = string,
        Return extends string = string
    > = `(${Args})=>${Return}`

    export type Parse<
        Def extends Definition,
        Space,
        Context extends ParseTypeContext
    > = Def extends Definition<infer Args, infer Return>
        ? {
              args: Args extends ""
                  ? []
                  : ToList<
                        Fragment.Parse<
                            Args,
                            Space,
                            WithPropValue<
                                Context,
                                "delimiter",
                                Context["delimiter"] | ","
                            >
                        >
                    >
              returns: Fragment.Parse<Return, Space, Context>
          }
        : UnknownTypeError<Def>

    export type Node = {
        args: Fragment.Node[]
        returns: Fragment.Node
    }

    export type TypeOf<
        N extends Node,
        Space,
        Options extends ParseConfig,
        Args extends Fragment.Node[] = N["args"]
    > = Evaluate<
        // @ts-ignore
        (
            ...args: TypeOfArgs<Args, Space, Options>
        ) => Fragment.TypeOf<N["returns"], Space, Options>
    >

    type TypeOfArgs<
        Args extends Fragment.Node[],
        Space,
        Options extends ParseConfig
    > = {
        [I in keyof Args]: Fragment.TypeOf<Args[I], Space, Options>
    }

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
                    args: parameterDefs.map((arg) => Fragment.parse(arg, ctx)),
                    returns: Fragment.parse(returnDef, ctx)
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
            generate: ({ def }) => {
                throw new Error(ungeneratableError(def, "arrow function"))
            },
            references: ({ components: { returns, args } }) => [
                ...args.flatMap((arg) => arg.references()),
                ...returns.references()
            ]
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
