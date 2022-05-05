import {
    typeDefProxy,
    shallowCycleError,
    generateRequiredCycleError,
    createParser,
    errorsFromCustomValidator
} from "./internal.js"
import { Root } from "../../root.js"
import { Reference } from "./index.js"

export namespace Alias {
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
                        Root.parser.parse(ctx.config.space!.dictionary[def], {
                            ...ctx,
                            seen: [...ctx.seen, def],
                            shallowSeen: [...ctx.shallowSeen, def],
                            modifiers: []
                        })
                }
            }
        },
        {
            matches: (def, ctx) => def in (ctx.config?.space?.dictionary ?? {}),
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
