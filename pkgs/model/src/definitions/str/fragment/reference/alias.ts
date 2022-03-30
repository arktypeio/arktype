import { IsAny, Or } from "@re-/tools"
import {
    TypeOfContext,
    typeDefProxy,
    ValidationErrorMessage,
    shallowCycleError,
    generateRequiredCycleError,
    createParser,
    DefaultParseTypeContext
} from "./internal.js"
import { Root } from "../../../root.js"
import { Reference } from "./index.js"
import { SpaceOptions } from "../../../../space.js"

export namespace Alias {
    export type Definition<Space> = keyof Space & string

    export type Check<
        TypeName extends Definition<Space>,
        Root,
        Space
    > = Space[TypeName] extends ValidationErrorMessage ? Space[TypeName] : Root

    export type TypeOf<
        TypeName extends Definition<Space>,
        Space,
        Options extends TypeOfContext<Space>
    > = IsAny<Space> extends true
        ? Space
        : Space[TypeName] extends ValidationErrorMessage
        ? unknown
        : TypeName extends keyof Options["seen"]
        ? Options["onCycle"] extends never
            ? TypeOfResolvedNonCyclicDefinition<TypeName, Space, Options>
            : TypeOfResolvedCyclicDefinition<TypeName, Space, Options>
        : TypeOfResolvedNonCyclicDefinition<TypeName, Space, Options>

    export type TypeOfResolvedCyclicDefinition<
        TypeName extends Definition<Space>,
        Space,
        Options extends TypeOfContext<Space>
    > = Root.TypeOf<
        Root.Parse<
            Options["onCycle"],
            Omit<Space, "cyclic"> & { cyclic: Space[TypeName] },
            DefaultParseTypeContext
        >,
        Omit<Space, "cyclic"> & { cyclic: Space[TypeName] },
        {
            onCycle: Options["deepOnCycle"] extends true
                ? Options["onCycle"]
                : never
            seen: {}
            onResolve: Options["onResolve"]
            deepOnCycle: Options["deepOnCycle"]
            spaceConfig: Options["spaceConfig"] &
                SpaceOptions<(keyof Space | "cyclic") & string>
        }
    >

    export type TypeOfResolvedNonCyclicDefinition<
        TypeName extends Definition<Space>,
        Space,
        Options extends TypeOfContext<Space>
    > = Or<
        Options["onResolve"] extends never ? true : false,
        TypeName extends "resolved" ? true : false
    > extends true
        ? Root.TypeOf<
              Root.Parse<Space[TypeName], Space, DefaultParseTypeContext>,
              Space,
              Options & {
                  seen: { [K in TypeName]: true }
              }
          >
        : Root.TypeOf<
              Root.Parse<
                  Options["onResolve"],
                  Omit<Space, "resolved"> & { resolved: Space[TypeName] },
                  DefaultParseTypeContext
              >,
              Omit<Space, "resolved"> & { resolved: Space[TypeName] },
              // @ts-ignore
              Options & {
                  seen: { [K in TypeName]: true }
              }
          >

    export const type = typeDefProxy as string

    export const parse = createParser(
        {
            type,
            parent: () => Reference.parse,
            components: (def, ctx) => {
                /**
                 * Keep track of definitions we've seen since last resolving to an object or built-in.
                 * If we encounter the same definition twice, we're dealing with a shallow cyclic space
                 * like {user: "person", person: "user"}.
                 **/
                if (ctx.shallowSeen.includes(def)) {
                    throw new Error(
                        shallowCycleError({
                            def,
                            ctx
                        })
                    )
                }
                return {
                    resolve: () =>
                        Root.parse(ctx.space[def], {
                            ...ctx,
                            seen: [...ctx.seen, def],
                            shallowSeen: [...ctx.shallowSeen, def],
                            modifiers: []
                        })
                }
            }
        },
        {
            matches: (def, ctx) => def in ctx.space,
            allows: ({ components: { resolve } }, valueType, opts) =>
                resolve().allows(valueType, opts),
            generate: ({ components: { resolve }, ctx, def }, opts) => {
                if (ctx.seen.includes(def)) {
                    if (opts.onRequiredCycle) {
                        return opts.onRequiredCycle
                    }
                    throw new Error(generateRequiredCycleError({ def, ctx }))
                }
                return resolve().generate(opts)
            }
        }
    )

    export const delegate = parse as any as string
}
