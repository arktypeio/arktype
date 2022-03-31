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
import { validationError } from "../internal.js"

export namespace Alias {
    export type Definition<Resolutions> = keyof Resolutions & string

    export type TypeOf<
        TypeName extends Definition<Resolutions>,
        Resolutions,
        Options extends TypeOfContext<Resolutions>
    > = IsAny<Resolutions> extends true
        ? Resolutions
        : Resolutions[TypeName] extends ValidationErrorMessage
        ? unknown
        : TypeName extends keyof Options["seen"]
        ? Options["onCycle"] extends never
            ? TypeOfResolvedNonCyclicDefinition<TypeName, Resolutions, Options>
            : TypeOfResolvedCyclicDefinition<TypeName, Resolutions, Options>
        : TypeOfResolvedNonCyclicDefinition<TypeName, Resolutions, Options>

    export type TypeOfResolvedCyclicDefinition<
        TypeName extends Definition<Resolutions>,
        Resolutions,
        Options extends TypeOfContext<Resolutions>
    > = Root.TypeOf<
        Root.Parse<
            Options["onCycle"],
            Omit<Resolutions, "cyclic"> & { cyclic: Resolutions[TypeName] },
            DefaultParseTypeContext
        >,
        Omit<Resolutions, "cyclic"> & { cyclic: Resolutions[TypeName] },
        {
            onCycle: Options["deepOnCycle"] extends true
                ? Options["onCycle"]
                : never
            seen: {}
            onResolve: Options["onResolve"]
            deepOnCycle: Options["deepOnCycle"]
        }
    >

    export type TypeOfResolvedNonCyclicDefinition<
        TypeName extends Definition<Resolutions>,
        Resolutions,
        Options extends TypeOfContext<Resolutions>
    > = Or<
        Options["onResolve"] extends never ? true : false,
        TypeName extends "resolved" ? true : false
    > extends true
        ? Root.TypeOf<
              Root.Parse<
                  Resolutions[TypeName],
                  Resolutions,
                  DefaultParseTypeContext
              >,
              Resolutions,
              Options & {
                  seen: { [K in TypeName]: true }
              }
          >
        : Root.TypeOf<
              Root.Parse<
                  Options["onResolve"],
                  Omit<Resolutions, "resolved"> & {
                      resolved: Resolutions[TypeName]
                  },
                  DefaultParseTypeContext
              >,
              Omit<Resolutions, "resolved"> & {
                  resolved: Resolutions[TypeName]
              },
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
                        Root.parse(ctx.config.space!.resolutions[def], {
                            ...ctx,
                            seen: [...ctx.seen, def],
                            shallowSeen: [...ctx.shallowSeen, def],
                            modifiers: []
                        })
                }
            }
        },
        {
            matches: (def, ctx) =>
                def in (ctx.config?.space?.resolutions ?? {}),
            validate: ({ ctx, def, components: { resolve } }, value, opts) => {
                const errors = resolve().validate(value, opts)
                const customValidator =
                    ctx.config.space?.config?.models?.[def]?.validate
                        ?.validator ??
                    ctx.config.space?.config?.validate?.validator ??
                    undefined
                if (customValidator) {
                    const customResult = customValidator(value, errors, ctx)
                    return typeof customResult === "string"
                        ? validationError({
                              path: ctx.path,
                              message: customResult
                          })
                        : customResult
                }
                return errors
            },
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
