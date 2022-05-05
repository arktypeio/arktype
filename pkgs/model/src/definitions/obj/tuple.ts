import { Evaluate, Get } from "@re-/tools"
import {
    typeDefProxy,
    createParser,
    tupleLengthError,
    validationError,
    ValidationErrors
} from "./internal.js"
import { Root } from "../root.js"
import { Obj } from "./obj.js"
import { typeOf } from "../../utils.js"

export namespace Tuple {
    export const type = typeDefProxy as any[]

    export const parser = createParser(
        {
            type,
            parent: () => Obj.parser,
            components: (def, ctx) =>
                def.map((itemDef, index) =>
                    Root.parser.parse(itemDef, {
                        ...ctx,
                        path: [...ctx.path, `${index}`],
                        shallowSeen: []
                    })
                )
        },
        {
            matches: (def) => Array.isArray(def),
            validate: ({ def, ctx, components }, value, opts) => {
                const valueType = typeOf(value)
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
                        ...component.validate((value as any)[index], opts)
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

    export const delegate = parser as any as any[]
}
