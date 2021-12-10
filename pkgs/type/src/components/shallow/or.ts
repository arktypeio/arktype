import { transform, Unlisted } from "@re-do/utils"
import {
    comparableDefaultValueSet,
    nonComparableDefaultValues,
    ParseSplittable,
    ValidateSplittable,
    typeDefProxy,
    isRequiredCycleError,
    stringifyErrors,
    OrTypeErrors,
    orValidationError,
    validationError,
    createParser,
    ParseContext,
    ParseConfig
} from "./common.js"
import { Fragment } from "./fragment.js"

export namespace Or {
    export type Definition<
        Before extends string = string,
        After extends string = string
    > = `${Before}|${After}`

    export type Parse<
        Def extends Definition,
        TypeSet,
        Options extends ParseConfig
    > = Unlisted<ParseSplittable<"|", Def, TypeSet, Options>>

    export type Validate<
        Def extends Definition,
        Root extends string,
        TypeSet
    > = ValidateSplittable<"|", Def, Root, TypeSet>

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Fragment.parse,
            matches: (definition) => definition.includes("|"),
            components: (def: Definition, ctx: ParseContext) =>
                def.split("|").map((fragment) => Fragment.parse(fragment, ctx))
        },
        {
            allows: ({ def, ctx, components }, valueType, opts) => {
                const orErrors: OrTypeErrors = {}
                for (const fragment of components) {
                    const fragmentErrors = stringifyErrors(
                        fragment.allows(valueType, opts)
                    )
                    if (!fragmentErrors) {
                        // If one of the or types doesn't return any errors, the whole type is valid
                        return {}
                    }
                    orErrors[fragment.def] = fragmentErrors
                }
                return validationError({
                    path: ctx.path,
                    message: orValidationError({
                        def,
                        valueType,
                        orErrors
                    })
                })
            },
            generate: ({ components }, opts) => {
                let requiredCycleError = ""
                const possibleValues = transform(
                    components,
                    ([i, fragment]) => {
                        try {
                            return [i, fragment.generate(opts)]
                        } catch (e: any) {
                            if (isRequiredCycleError(e.message)) {
                                if (!requiredCycleError) {
                                    requiredCycleError = e.message
                                }
                                // Omit it from "possibleValues"
                                return null
                            }
                            throw e
                        }
                    },
                    { asArray: "always" }
                )
                for (const comparableValue of comparableDefaultValueSet) {
                    if (possibleValues.includes(comparableValue)) {
                        return comparableValue
                    }
                }

                for (const valueType in nonComparableDefaultValues) {
                    const matchingValue = possibleValues.find(
                        (value) => typeof value === valueType
                    )
                    if (matchingValue) {
                        return matchingValue
                    }
                }
                if (requiredCycleError) {
                    throw new Error(requiredCycleError)
                }
                // The only type that should get to this point without returning is a custom
                // value from onRequiredCycle, so just return the first one
                return possibleValues[0]
            },
            references: ({ components }, opts) => {
                // components[0].references
                return components.flatMap((component) =>
                    component.references(opts)
                )
            }
        }
    )

    export const delegate = parse as any as Definition
}
