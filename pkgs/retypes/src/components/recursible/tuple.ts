import { createNode, createParser, NodeInput } from "../parser.js"
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

    export const node = createNode({
        type,
        parent: () => Recursible.node,
        matches: ({ definition }) => Array.isArray(definition),
        implements: {
            allows: (args) => {
                if (!Array.isArray(args.assignment)) {
                    // Defined is a tuple, extracted is an object with string keys (will never be assignable)
                    return validationError(args)
                }
                if (args.definition.length !== args.assignment.length) {
                    return validationError({
                        ...args,
                        message: tupleLengthError(args as any)
                    })
                }
                return validateProperties(args)
            }
        }
    })

    export const parser = createParser(node)
}
