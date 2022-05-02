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
import { typeOf } from "../../../../utils.js"

export namespace Intersection {
    export type Definition<
        Before extends string = string,
        After extends string = string
    > = `${Before}&${After}`

    export type Parse<
        Def extends Definition,
        Resolutions,
        Context
    > = Def extends Definition<infer Left, infer Right>
        ? {
              intersection: [
                  Fragment.Parse<Left, Resolutions, Context>,
                  Fragment.Parse<Right, Resolutions, Context>
              ]
          }
        : UnknownTypeError<Def>

    export type Node = {
        intersection: Fragment.Node[]
    }

    export type TypeOf<N extends Node, Resolutions, Options> = Fragment.TypeOf<
        N["intersection"][0],
        Resolutions,
        Options
    > &
        Fragment.TypeOf<N["intersection"][1], Resolutions, Options>

    export const type = typeDefProxy as Definition

    export const parser = createParser(
        {
            type,
            parent: () => Expression.parser,
            components: (def: Definition, ctx: ParseContext) =>
                def
                    .split("&")
                    .map((fragment) => Fragment.parser.parse(fragment, ctx))
        },
        {
            matches: (definition) => definition.includes("&"),
            validate: ({ def, ctx, components }, value, opts) => {
                const valueType = typeOf(value)
                const errors: SplittableErrors = {}
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

    export const delegate = parser as any as Definition
}
