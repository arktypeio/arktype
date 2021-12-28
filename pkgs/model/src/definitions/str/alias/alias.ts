import { IsAny, Or as LogicalOr } from "@re-/tools"
import {
    ParseConfig,
    typeDefProxy,
    ValidationErrorMessage,
    shallowCycleError,
    generateRequiredCycleError,
    createParser
} from "./internal.js"
import { Root } from "../../root.js"
import { Str } from "../str.js"

export namespace Alias {
    export type Definition<Space> = keyof Space & string

    export type Check<
        TypeName extends Definition<Space>,
        Root,
        Space
    > = Space[TypeName] extends ValidationErrorMessage ? Space[TypeName] : Root

    export type Parse<
        TypeName extends Definition<Space>,
        Space,
        Options extends ParseConfig
    > = IsAny<Space> extends true
        ? Space
        : Space[TypeName] extends ValidationErrorMessage
        ? unknown
        : TypeName extends keyof Options["seen"]
        ? Options["onCycle"] extends never
            ? ParseResolvedNonCyclicDefinition<TypeName, Space, Options>
            : ParseResolvedCyclicDefinition<TypeName, Space, Options>
        : ParseResolvedNonCyclicDefinition<TypeName, Space, Options>

    export type ParseResolvedCyclicDefinition<
        TypeName extends Definition<Space>,
        Space,
        Options extends ParseConfig
    > = Root.Parse<
        Options["onCycle"],
        Omit<Space, "cyclic"> & { cyclic: Space[TypeName] },
        {
            onCycle: Options["deepOnCycle"] extends true
                ? Options["onCycle"]
                : never
            seen: {}
            onResolve: Options["onResolve"]
            deepOnCycle: Options["deepOnCycle"]
        }
    >

    export type ParseResolvedNonCyclicDefinition<
        TypeName extends Definition<Space>,
        Space,
        Options extends ParseConfig
    > = LogicalOr<
        Options["onResolve"] extends never ? true : false,
        TypeName extends "resolved" ? true : false
    > extends true
        ? Root.Parse<
              Space[TypeName],
              Space,
              Options & {
                  seen: { [K in TypeName]: true }
              }
          >
        : Root.Parse<
              Options["onResolve"],
              Omit<Space, "resolved"> & { resolved: Space[TypeName] },
              Options & {
                  seen: { [K in TypeName]: true }
              }
          >

    export const type = typeDefProxy as string

    export const parse = createParser(
        {
            type,
            parent: () => Str.parse,
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
                            shallowSeen: [...ctx.shallowSeen, def]
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
