import { Get, isEmpty } from "@re-/tools"
import {
    typeDefProxy,
    stringifyErrors,
    SplittableErrors,
    splittableValidationError,
    validationError,
    createParser,
    ParseContext,
    ungeneratableError,
    Root,
    DeepNode,
    Defer
} from "./internal.js"
import { Str } from "../str.js"
import { Expression } from "./expression.js"
import { typeOf } from "../../../utils.js"

export namespace Intersection {
    export type Definition<
        Before extends string = string,
        After extends string = string
    > = `${Before}&${After}`

    export type Kind = "intersection"

    export type Parse<Def, Resolutions, Context> = Def extends Definition<
        infer Left,
        infer Right
    >
        ? DeepNode<
              Def,
              Kind,
              [
                  Str.Parse<Left, Resolutions, Context>,
                  Str.Parse<Right, Resolutions, Context>
              ]
          >
        : Defer

    export type TypeOf<
        N,
        Resolutions,
        Options,
        Children = Get<N, "children">
    > = Root.TypeOf<Get<Children, 0>, Resolutions, Options> &
        Root.TypeOf<Get<Children, 1>, Resolutions, Options>

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
