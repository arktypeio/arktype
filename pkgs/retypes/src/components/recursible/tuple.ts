import { createParser } from "../parser.js"
import {
    tupleLengthError,
    unassignableError,
    validationError
} from "../errors.js"
import {
    ValidateRecursible,
    Root,
    ParseTypeRecurseOptions,
    validateProperties
} from "./common.js"
import { Recursible } from "./recursible.js"
import { typeDefProxy } from "../../common.js"

export namespace Tuple {
    export type Definition<Def extends Root.Definition[] = Root.Definition[]> =
        Def

    export type Validate<
        Def,
        DeclaredTypeName extends string,
        ExtractTypesReferenced extends boolean
    > = ValidateRecursible<Def, DeclaredTypeName, ExtractTypesReferenced>

    export type Parse<
        Def extends Definition,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = {
        [Index in keyof Def]: Root.Parse<Def[Index], TypeSet, Options>
    }

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Recursible.parse,
        matches: ({ definition }) => Array.isArray(definition),
        parse: (definition, context) => ({
            allows: (assignment, opts) => {
                if (!Array.isArray(assignment)) {
                    // Defined is a tuple, extracted is an object with string keys (will never be assignable)
                    return validationError({
                        definition,
                        assignment,
                        path: context.path
                    })
                }
                if (definition.length !== assignment.length) {
                    return validationError({
                        path: context.path,
                        message: tupleLengthError({ definition, assignment })
                    })
                }
                return validateProperties(definition, context, assignment, opts)
            }
        })
    })

    export const delegate = parse as any as Definition
}
