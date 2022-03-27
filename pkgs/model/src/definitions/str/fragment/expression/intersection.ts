import { isEmpty } from "@re-/tools"
import {
    typeDefProxy,
    stringifyErrors,
    SplittableErrors,
    splittableValidationError,
    validationError,
    createParser,
    ParseContext
} from "./internal.js"
import { Fragment } from "../fragment.js"
import { Expression } from "./expression.js"
import {
    TypeOfContext,
    ParseTypeContext,
    ungeneratableError,
    UnknownTypeError
} from "../internal.js"

export namespace Intersection {
    export type Definition<
        Before extends string = string,
        After extends string = string
    > = `${Before}&${After}`

    export type Parse<
        Def extends Definition,
        Space,
        Context extends ParseTypeContext
    > = Def extends Definition<infer Left, infer Right>
        ? {
              intersection: [
                  Fragment.Parse<Left, Space, Context>,
                  Fragment.Parse<Right, Space, Context>
              ]
          }
        : UnknownTypeError<Def>

    export type Node = {
        intersection: Fragment.Node[]
    }

    export type TypeOf<
        N extends Node,
        Space,
        Options extends TypeOfContext
    > = Fragment.TypeOf<N["intersection"][0], Space, Options> &
        Fragment.TypeOf<N["intersection"][1], Space, Options>

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
                throw new Error(ungeneratableError(def, "intersection"))
            },
            references: ({ components }) =>
                components.reduce(
                    (refs, member) => [...refs, ...member.references()],
                    [] as string[]
                )
        }
    )

    export const delegate = parse as any as Definition
}
