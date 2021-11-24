import { createParser } from "../parser.js"
import {
    tupleLengthError,
    validationError,
    ValidationErrors
} from "../errors.js"
import {
    Root,
    ParseTypeRecurseOptions,
    ValidateTypeRecurseOptions
} from "../common.js"
import { Recursible } from "./recursible.js"
import { typeDefProxy } from "../../common.js"
import { Evaluate, stringify } from "@re-do/utils"

export namespace Tuple {
    export type Definition<Def extends Root.Definition[] = Root.Definition[]> =
        Def

    export type Validate<
        Def,
        TypeSet,
        Options extends ValidateTypeRecurseOptions
    > = Evaluate<
        {
            [Index in keyof Def]: Root.Validate<Def[Index], TypeSet, Options>
        }
    >

    export type Parse<
        Def extends Definition,
        TypeSet,
        Options extends ParseTypeRecurseOptions
    > = {
        [Index in keyof Def]: Root.Parse<Def[Index], TypeSet, Options>
    }

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Recursible.parse,
            matches: (def) => Array.isArray(def),
            components: (def, ctx) =>
                def.map((itemDef, index) =>
                    Root.parse(itemDef, {
                        ...ctx,
                        path: [...ctx.path, `${index}`],
                        shallowSeen: []
                    })
                )
        },
        {
            allows: ({ def, ctx, components }, valueType, opts) => {
                if (!Array.isArray(valueType)) {
                    // Defined is a tuple, extracted is an object with string keys (will never be assignable)
                    return validationError({
                        def,
                        valueType,
                        path: ctx.path
                    })
                }
                if (def.length !== valueType.length) {
                    return validationError({
                        path: ctx.path,
                        message: tupleLengthError({
                            def,
                            valueType
                        })
                    })
                }
                return components.reduce(
                    (errors, component, index) => ({
                        ...errors,
                        ...component.allows(valueType[index], opts)
                    }),
                    {} as ValidationErrors
                )
            },
            generate: ({ components }, opts) =>
                components.map((item) => item.generate(opts)),
            references: ({ components }, opts) =>
                components.map((item) => item.references(opts))
        }
    )

    export const delegate = parse as any as Definition
}
