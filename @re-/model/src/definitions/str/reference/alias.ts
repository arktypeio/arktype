import { And, WithPropValue } from "@re-/tools"
import { Root } from "../../root.js"
import {
    createParser,
    errorsFromCustomValidator,
    generateRequiredCycleError,
    shallowCycleError,
    typeDefProxy
} from "./internal.js"
import { Reference } from "./index.js"

export namespace Alias {
    export const type = typeDefProxy as string

    export type FastParse<Def extends keyof Dict, Dict, Seen> = And<
        "onResolve" extends keyof Dict ? true : false,
        Def extends "resolution" ? false : true
    > extends true
        ? Root.Parse<
              // @ts-ignore
              Dict["onResolve"],
              WithPropValue<Dict, "resolution", Dict[Def]>,
              Seen & { [K in Def]: true }
          >
        : And<
              "onCycle" extends keyof Dict ? true : false,
              Def extends keyof Seen ? true : false
          > extends true
        ? Root.Parse<
              // @ts-ignore
              Dict["onCycle"],
              WithPropValue<Dict, "cyclic", Dict[Def]>,
              {}
          >
        : Root.Parse<Dict[Def], Dict, Seen & { [K in Def]: true }>

    export const parser = createParser(
        {
            type,
            parent: () => Reference.parser,
            components: (def, ctx) => {
                /**
                 * Keep track of definitions we've seen since last resolving to an object or built-in.
                 * If we encounter the same definition twice, we're dealing with a shallow cyclic space
                 * like {user: "person", person: "user"}.
                 *
                 */
                if (ctx.shallowSeen.includes(def)) {
                    throw new Error(
                        shallowCycleError({
                            def,
                            ctx
                        })
                    )
                }
                let nextDef = ctx.config.space.dictionary[def]
                if (
                    ctx.seen.includes(def) &&
                    "onCycle" in ctx.config.space.config
                ) {
                    ctx.config.space.dictionary.cyclic = nextDef
                    nextDef = ctx.config.space.config.onCycle
                } else if (
                    ctx.seen.includes(def) &&
                    "onResolve" in ctx.config.space.config
                ) {
                    ctx.config.space.dictionary.resolution = nextDef
                    nextDef = ctx.config.space.config.onResolve
                }
                return {
                    resolve: () =>
                        Root.parser.parse(nextDef, {
                            ...ctx,
                            seen: [...ctx.seen, def],
                            shallowSeen: [...ctx.shallowSeen, def],
                            stringRoot: null
                        })
                }
            }
        },
        {
            matches: (def, ctx) =>
                def in ctx.config.space.dictionary ||
                def === "cyclic" ||
                def === "resolution",
            validate: ({ ctx, def, components: { resolve } }, value, opts) => {
                const errors = resolve().validate(value, opts)
                const customValidator =
                    ctx.config.space.config?.models?.[def]?.validate
                        ?.validator ??
                    ctx.config.space.config.validate?.validator
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
