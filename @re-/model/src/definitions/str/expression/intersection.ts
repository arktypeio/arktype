import { isEmpty } from "@re-/tools"
import { typeOf } from "../../../utils.js"
import { Str } from "../str.js"
import { Expression } from "./expression.js"
import {
    createParser,
    ParseContext,
    splittableValidationError,
    stringifyErrors,
    typeDefProxy,
    ungeneratableError,
    validationError
} from "./internal.js"

export namespace Intersection {
    export type Definition<
        Left extends string = string,
        Right extends string = string
    > = `${Left}&${Right}`

    export const type = typeDefProxy as Definition

    export const parser = createParser(
        {
            type,
            parent: () => Expression.parser,
            components: (def: Definition, ctx: ParseContext) =>
                def
                    .split("&")
                    .map((fragment) => Str.parser.parse(fragment, ctx))
        },
        {
            matches: (definition) => definition.includes("&"),
            validate: ({ def, ctx, components }, value, opts) => {
                const valueType = typeOf(value)
                const errors: Record<string, string> = {}
                for (const component of components) {
                    const componentErrors = stringifyErrors(
                        component.validate(value, opts)
                    )
                    if (componentErrors) {
                        errors[component.def] = componentErrors
                    }
                }
                if (isEmpty(errors)) {
                    return {}
                }
                return validationError({
                    path: ctx.path,
                    message: splittableValidationError({
                        def,
                        valueType,
                        errors,
                        delimiter: "&",
                        verbose: !!opts.verbose
                    })
                })
            },
            generate: ({ def }) => {
                throw new Error(ungeneratableError(def, "intersection"))
            },
            references: ({ components }) =>
                components.reduce(
                    (refs, member) => [...refs, ...member.references()],
                    [] as string[]
                )
        }
    )

    export const delegate = parser as any as Definition
}
