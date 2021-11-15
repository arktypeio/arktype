import { Unlisted } from "@re-do/utils"
import { typeDefProxy } from "../../common.js"
import { stringifyErrors } from "../../validate.js"
import { OrTypeErrors, orValidationError, validationError } from "../errors.js"
import { createParser, ParseContext } from "../parser.js"
import {
    comparableDefaultValueSet,
    nonComparableDefaultValues,
    ParseTypeRecurseOptions
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
        Options extends ParseTypeRecurseOptions,
        Result extends ParseSplittableResult = ParseSplittable<
            "|",
            Def,
            TypeSet,
            Options
        >
    > = Result["Errors"] extends ""
        ? Unlisted<Result["Components"]>
        : Result["Errors"]

    export type Validate<
        Def extends Definition,
        Root extends string,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean
    > = ValidateSplittable<
        "|",
        Def,
        Root,
        DeclaredTypeName,
        ExtractTypesReferenced
    >

    export const type = typeDefProxy as Definition

    const parts = (definition: Definition, context: ParseContext<Definition>) =>
        definition.split("|").map((part) => Fragment.parse(part, context))

    export const parse = createParser({
        type,
        parent: () => Fragment.parse,
        matches: (definition) => definition.includes("|"),
        implements: {
            allows: (definition, context, assignment, opts) => {
                const orErrors: OrTypeErrors = {}
                for (const part of parts(definition, context)) {
                    const partErrors = stringifyErrors(part.allows(assignment))
                    if (!partErrors) {
                        // If one of the or types doesn't return any errors, the whole type is valid
                        return {}
                    }
                    orErrors[part.definition] = partErrors
                }
                return validationError({
                    path: context.path,
                    message: orValidationError({
                        definition,
                        assignment,
                        orErrors
                    })
                })
            },
            getDefault: (definition, context, opts) => {
                const possibleValues = parts(definition, context).map((part) =>
                    part.getDefault(opts)
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
                // The only type that should get to this point without returning is a custom
                // value from returnOnCycle, so just return the first one
                return possibleValues[0]
            },
            references: (definition, context, opts) =>
                parts(definition, context).flatMap((part) =>
                    part.references(opts)
                )
        }
    })
    export const delegate = parse as any as Definition
}
