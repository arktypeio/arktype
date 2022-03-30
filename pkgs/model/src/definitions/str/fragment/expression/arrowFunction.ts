import { Evaluate, WithPropValue, ToList } from "@re-/tools"
import {
    typeDefProxy,
    validationError,
    createParser,
    TypeOfContext,
    UnknownTypeError,
    ParseTypeContext
} from "./internal.js"
import { Fragment } from "../fragment.js"
import { Expression } from "./expression.js"
import { ungeneratableError } from "../internal.js"
import { typeOf } from "../../../../utils.js"

export namespace ArrowFunction {
    export type Definition<
        Args extends string = string,
        Return extends string = string
    > = `(${Args})=>${Return}`

    export type Parse<
        Def extends Definition,
        Resolutions,
        Context extends ParseTypeContext
    > = Def extends Definition<infer Args, infer Return>
        ? {
              args: Args extends ""
                  ? []
                  : ToList<
                        Fragment.Parse<
                            Args,
                            Resolutions,
                            WithPropValue<
                                Context,
                                "delimiter",
                                Context["delimiter"] | ","
                            >
                        >
                    >
              returns: Fragment.Parse<Return, Resolutions, Context>
          }
        : UnknownTypeError<Def>

    export type Node = {
        args: Fragment.Node[]
        returns: Fragment.Node
    }

    export type TypeOf<
        N extends Node,
        Resolutions,
        Options extends TypeOfContext<Resolutions>,
        Args extends Fragment.Node[] = N["args"]
    > = Evaluate<
        // @ts-ignore
        (
            ...args: TypeOfArgs<Args, Resolutions, Options>
        ) => Fragment.TypeOf<N["returns"], Resolutions, Options>
    >

    type TypeOfArgs<
        Args extends Fragment.Node[],
        Resolutions,
        Options extends TypeOfContext<Resolutions>
    > = {
        [I in keyof Args]: Fragment.TypeOf<Args[I], Resolutions, Options>
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
            allows: ({ def, ctx: { path } }, value) => {
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

    export const delegate = parse as any as Definition
}

// type CheckParameterTuple<
//     Def extends string,
//     Root extends string,
//     Space
// > = Def extends "" ? "" : CheckSplittable<",", Def, Root, Space>

// type ParseParameterTuple<
//     Def extends string,
//     Resolutions,
//     Options extends ParseConfig
// > = Def extends "" ? [] : ParseSplittable<",", Def, Resolutions, Options>
