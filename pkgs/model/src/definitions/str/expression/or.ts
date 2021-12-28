import { transform, TypeCategory, Unlisted } from "@re-/tools"
import {
    ParseSplittable,
    CheckSplittable,
    typeDefProxy,
    isRequiredCycleError,
    stringifyErrors,
    OrTypeErrors,
    orValidationError,
    validationError,
    createParser,
    ParseContext,
    ParseConfig
} from "./internal.js"
import { Str } from "../str.js"
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

export namespace Or {
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
                def.split("|").map((fragment) => Str.parse(fragment, ctx))
        },
        {
            matches: (definition) => definition.includes("|"),
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
                if (requiredCycleError) {
                    throw new Error(requiredCycleError)
                }
                // The only type that should get to this point without returning is a custom
                // value from onRequiredCycle, so just return the first one
                return possibleValues[0]
            }
        }
    )

    export const delegate = parse as any as Definition
}
