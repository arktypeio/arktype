import { isEmpty, Unlisted } from "@re-/tools"
import {
    ParseSplittable,
    CheckSplittable,
    typeDefProxy,
    stringifyErrors,
    SplittableErrors,
    splittableValidationError,
    validationError,
    createParser,
    ParseContext,
    ParseConfig
} from "./internal.js"
import { Fragment } from "../fragment.js"
import { Expression } from "./expression.js"

export namespace Intersection {
    export type Definition<
        Before extends string = string,
        After extends string = string
    > = `${Before}&${After}`

    export type Parse<
        Def extends Definition,
        Space,
        Options extends ParseConfig
    > = Unlisted<ParseSplittable<"&", Def, Space, Options>>

    export type Check<
        Def extends Definition,
        Root extends string,
        Space
    > = CheckSplittable<"&", Def, Root, Space>

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Expression.parse,
            components: (def: Definition, ctx: ParseContext) =>
                def.split("&").map((fragment) => Fragment.parse(fragment, ctx))
        },
        {
            matches: (definition) => definition.includes("&"),
            allows: ({ def, ctx, components }, valueType, opts) => {
                const errors: SplittableErrors = {}
                for (const component of components) {
                    const componentErrors = stringifyErrors(
                        component.allows(valueType, opts)
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
                        delimiter: "&"
                    })
                })
            },
            generate: ({ def, components }, opts) => {
                throw new Error("Can't generate & types.")
            }
        }
    )

    export const delegate = parse as any as Definition
}
