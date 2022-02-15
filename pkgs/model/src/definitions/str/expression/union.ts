import { transform, TypeCategory, Unlisted } from "@re-/tools"
import {
    ParseSplittable,
    CheckSplittable,
    typeDefProxy,
    isRequiredCycleError,
    stringifyErrors,
    UnionTypeErrors,
    unionValidationError,
    validationError,
    createParser,
    ParseContext,
    ParseConfig
} from "./internal.js"
import { Fragment } from "../fragment.js"
import { Expression } from "./expression.js"

type PreferredDefaults = ({ value: any } | { typeOf: TypeCategory })[]

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
        Before extends string = string,
        After extends string = string
    > = `${Before}|${After}`

    export type Parse<
        Def extends Definition,
        Space,
        Options extends ParseConfig
    > = Unlisted<ParseSplittable<"|", Def, Space, Options>>

    export type Check<
        Def extends Definition,
        Root extends string,
        Space
    > = CheckSplittable<"|", Def, Root, Space>

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Expression.parse,
            components: (def: Definition, ctx: ParseContext) =>
                def.split("|").map((fragment) => Fragment.parse(fragment, ctx))
        },
        {
            matches: (definition) => definition.includes("|"),
            allows: ({ def, ctx, components }, valueType, opts) => {
                const unionErrors: UnionTypeErrors = {}
                for (const fragment of components) {
                    const fragmentErrors = stringifyErrors(
                        fragment.allows(valueType, opts)
                    )
                    if (!fragmentErrors) {
                        // If one of the union types doesn't return any errors, the whole type is valid
                        return {}
                    }
                    unionErrors[fragment.def] = fragmentErrors
                }
                return validationError({
                    path: ctx.path,
                    message: unionValidationError({
                        def,
                        valueType,
                        unionErrors
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
            }
        }
    )

    export const delegate = parse as any as Definition
}
