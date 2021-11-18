import { Unlisted } from "@re-do/utils"
import { typeDefProxy } from "../../common.js"
import { stringifyErrors } from "../errors.js"
import { OrTypeErrors, orValidationError, validationError } from "../errors.js"
import { createParser, ParseContext } from "../parser.js"
import { Recursible } from "../recursible/index.js"
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
                    orErrors[fragment.definition] = fragmentErrors
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
                const possibleValues = components.map((fragment) =>
                    fragment.generate(opts)
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
