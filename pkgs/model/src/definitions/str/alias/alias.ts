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
    export type Definition<Typespace> = keyof Typespace & string

    export type Check<
        TypeName extends Definition<Typespace>,
        Root,
        Typespace
    > = Typespace[TypeName] extends ValidationErrorMessage
        ? Typespace[TypeName]
        : Root

    export type Parse<
        TypeName extends Definition<Typespace>,
        Typespace,
        Options extends ParseConfig
    > = IsAny<Typespace> extends true
        ? Typespace
        : Typespace[TypeName] extends ValidationErrorMessage
        ? unknown
        : TypeName extends keyof Options["seen"]
        ? Options["onCycle"] extends never
            ? ParseResolvedNonCyclicDefinition<TypeName, Typespace, Options>
            : ParseResolvedCyclicDefinition<TypeName, Typespace, Options>
        : ParseResolvedNonCyclicDefinition<TypeName, Typespace, Options>

    export type ParseResolvedCyclicDefinition<
        TypeName extends Definition<Typespace>,
        Typespace,
        Options extends ParseConfig
    > = Root.Parse<
        Options["onCycle"],
        Omit<Typespace, "cyclic"> & { cyclic: Typespace[TypeName] },
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
        TypeName extends Definition<Typespace>,
        Typespace,
        Options extends ParseConfig
    > = LogicalOr<
        Options["onResolve"] extends never ? true : false,
        TypeName extends "resolved" ? true : false
    > extends true
        ? Root.Parse<
              Typespace[TypeName],
              Typespace,
              Options & {
                  seen: { [K in TypeName]: true }
              }
          >
        : Root.Parse<
              Options["onResolve"],
              Omit<Typespace, "resolved"> & { resolved: Typespace[TypeName] },
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
                 * If we encounter the same definition twice, we're dealing with a shallow cyclic typespace
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
                        Root.parse(ctx.typespace[def], {
                            ...ctx,
                            seen: [...ctx.seen, def],
                            shallowSeen: [...ctx.shallowSeen, def]
                        })
                }
            }
        },
        {
            matches: (def, ctx) => def in ctx.typespace,
            validate: ({ components: { resolve } }, valueType, opts) =>
                resolve().validate(valueType, opts),
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
