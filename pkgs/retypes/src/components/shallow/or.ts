import { transform, Unlisted } from "@re-do/utils"
import { typeDefProxy } from "../../common.js"
import {
    isRequiredCycleError,
    requiredCycleErrorTemplate,
    stringifyErrors
} from "../errors.js"
import { OrTypeErrors, orValidationError, validationError } from "../errors.js"
import { createParser, ParseContext } from "../parser.js"
import { Recursible } from "../recursible/index.js"
import {
    comparableDefaultValueSet,
    nonComparableDefaultValues,
    ParseTypeRecurseOptions,
    ValidateTypeRecurseOptions
} from "./common.js"
import {
    ParseSplittable,
    ParseSplittableResult,
    ValidateSplittable
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
        Options extends ParseTypeRecurseOptions
    > = Unlisted<ParseSplittable<"|", Def, TypeSet, Options>>

    export type Validate<
        Def extends Definition,
        Root extends string,
        TypeSet,
        Options extends ValidateTypeRecurseOptions
    > = ValidateSplittable<"|", Def, Root, TypeSet, Options>

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Fragment.parse,
            matches: (definition) => definition.includes("|"),
            components: (def: Definition, ctx: ParseContext<Definition>) =>
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

type OrParse = typeof Or.parse

type F = string extends Recursible.Definition ? true : false

type Z = { a: "hello" } extends Recursible.Definition<{ a: "hello" }>
    ? true
    : false
