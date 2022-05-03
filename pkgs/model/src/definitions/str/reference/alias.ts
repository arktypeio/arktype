import { Get, IsAny, Or, WithPropValue } from "@re-/tools"
import {
    typeDefProxy,
    ValidationErrorMessage,
    shallowCycleError,
    generateRequiredCycleError,
    createParser,
    DefaultParseTypeContext,
    errorsFromCustomValidator,
    Defer,
    Unset,
    ShallowNode
} from "./internal.js"
import { Root } from "../../root.js"
import { Reference } from "./index.js"

export namespace Alias {
    export type Kind = "alias"

    export type Parse<Def, Resolutions, Options> = Def extends keyof Resolutions
        ? ShallowNode<Def, Kind, TypeOf<Def, Resolutions, Options>>
        : Defer

    export type TypeOf<Def, Resolutions, Options> =
        IsAny<Resolutions> extends true
            ? any
            : Def extends keyof Resolutions
            ? Resolutions[Def] extends ValidationErrorMessage
                ? unknown
                : Def extends keyof Get<Options, "seen">
                ? Get<Options, "onCycle"> extends Unset
                    ? TypeOfResolvedNonCyclicDefinition<
                          Def,
                          Resolutions,
                          Options
                      >
                    : TypeOfResolvedCyclicDefinition<Def, Resolutions, Options>
                : TypeOfResolvedNonCyclicDefinition<Def, Resolutions, Options>
            : unknown

    export type TypeOfResolvedCyclicDefinition<
        TypeName extends keyof Resolutions,
        Resolutions,
        Options
    > = Root.TypeOf<
        Root.Parse<
            Get<Options, "onCycle">,
            WithPropValue<Resolutions, "cyclic", Resolutions[TypeName]>,
            DefaultParseTypeContext
        >,
        WithPropValue<Resolutions, "cyclic", Resolutions[TypeName]>,
        {
            onCycle: Get<Options, "deepOnCycle"> extends true
                ? Get<Options, "onCycle">
                : Unset
            seen: {}
            onResolve: Get<Options, "onResolve">
            deepOnCycle: Get<Options, "deepOnCycle">
        }
    >

    export type TypeOfResolvedNonCyclicDefinition<
        TypeName extends keyof Resolutions,
        Resolutions,
        Options
    > = Or<
        Get<Options, "onResolve"> extends Unset ? true : false,
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
                  Get<Options, "onResolve">,
                  WithPropValue<Resolutions, "resolved", Resolutions[TypeName]>,
                  DefaultParseTypeContext
              >,
              WithPropValue<Resolutions, "resolved", Resolutions[TypeName]>,
              Options & {
                  seen: { [K in TypeName]: true }
              }
          >

    export const type = typeDefProxy as string

    export const parser = createParser(
        {
            type,
            parent: () => Reference.parser,
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
                        Root.parser.parse(ctx.config.space!.resolutions[def], {
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
                    return errorsFromCustomValidator(customValidator, [
                        value,
                        errors,
                        {
                            def,
                            ctx
                        }
                    ])
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

    export const delegate = parser as any as string
}
