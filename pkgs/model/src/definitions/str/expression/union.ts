import { transform, TypeOfResult } from "@re-/tools"
import {
    typeDefProxy,
    isRequiredCycleError,
    stringifyErrors,
    SplittableErrors,
    splittableValidationError,
    validationError,
    createParser,
    ParseContext
} from "./internal.js"
import { Str } from "../str.js"
import { Expression } from "./expression.js"
import { typeOf } from "../../../utils.js"

type PreferredDefaults = ({ value: any } | { typeOf: TypeOfResult })[]

export const preferredDefaults: PreferredDefaults = [
    { value: undefined },
    { value: null },
    { value: false },
    { value: true },
    { typeOf: "number" },
    { typeOf: "string" },
    { typeOf: "bigint" },
    { typeOf: "object" },
    { typeOf: "symbol" },
    { typeOf: "function" }
]

export namespace Union {
    export type Definition<
        Left extends string = string,
        Right extends string = string
    > = `${Left}|${Right}`

    export const type = typeDefProxy as Definition

    export const parser = createParser(
        {
            type,
            parent: () => Expression.parser,
            components: (def: Definition, ctx: ParseContext) =>
                def
                    .split("|")
                    .map((fragment) => Str.parser.parse(fragment, ctx))
        },
        {
            matches: (definition) => definition.includes("|"),
            validate: ({ def, ctx, components }, value, opts) => {
                const valueType = typeOf(value)
                const errors: SplittableErrors = {}
                for (const fragment of components) {
                    const fragmentErrors = stringifyErrors(
                        fragment.validate(value, opts)
                    )
                    if (!fragmentErrors) {
                        // If one of the union types doesn't return any errors, the whole type is valid
                        return {}
                    }
                    errors[fragment.def] = fragmentErrors
                }
                return validationError({
                    path: ctx.path,
                    message: splittableValidationError({
                        def,
                        valueType,
                        errors,
                        delimiter: "|",
                        verbose: !!opts.verbose
                    })
                })
            },
            generate: ({ def, components }, opts) => {
                const unknownErrorMessage = `Unable to generate a valid value for '${def}'.`
                let errorMessage = unknownErrorMessage
                const possibleValues = transform(
                    components,
                    ([i, fragment]) => {
                        try {
                            return [i, fragment.generate(opts)]
                        } catch (e: any) {
                            if (isRequiredCycleError(e.message)) {
                                if (errorMessage === unknownErrorMessage) {
                                    errorMessage = e.message
                                }
                                // Omit it from "possibleValues"
                                return null
                            }
                            /* istanbul ignore next */
                            throw e
                        }
                    },
                    { asArray: "always" }
                )
                for (const constraint of preferredDefaults) {
                    const matches = possibleValues.filter((value) =>
                        "value" in constraint
                            ? constraint.value === value
                            : constraint.typeOf === typeof value
                    )
                    if (matches.length) {
                        return matches[0]
                    }
                }
                // If we've made it to this point without returning, throw the
                // most descriptive error message we have
                throw new Error(errorMessage)
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
