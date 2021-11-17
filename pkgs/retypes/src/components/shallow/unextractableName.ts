import { createParser } from "../parser.js"
import { BuiltIn } from "./builtIn.js"
import { typeDefProxy } from "../../common.js"
import { ExtractableDefinition } from "./common.js"
import { validationError } from "../errors.js"

export namespace UnextractableName {
    export type Definition<Def extends keyof Defaults = keyof Defaults> = Def

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => BuiltIn.parse,
            matches: (definition) => definition in defaults
        },
        {
            allows: ({ def, ctx: { path } }, valueType) => {
                const assignabilityMap: {
                    [K in Definition]: (
                        extracted: ExtractableDefinition
                    ) => boolean
                } = {
                    any: () => true,
                    unknown: () => true,
                    boolean: (_) => _ === "true" || _ === "false",
                    object: (_) => typeof _ === "object",
                    void: (_) => _ === "undefined",
                    never: (_) => false,
                    string: (_) => typeof _ === "string" && !!_.match("'.*'"),
                    number: (_) => typeof _ === "number"
                }
                if (assignabilityMap[def](valueType)) {
                    return {}
                }
                return validationError({ def, valueType, path })
            }
        }
    )

    export const delegate = parse as any as Definition

    /**
     * These types can be used to specify a type definition but
     * will never be used to represent a value at runtime, either
     * because they are abstract type constructs (e.g. "never") or
     * because a more specific type will always be extracted (e.g.
     * "boolean", which will always evaluate as "true" or "false")
     */
    export const defaults = {
        unknown: undefined as unknown,
        any: undefined as any,
        object: {} as object,
        boolean: false as boolean,
        void: undefined as void,
        never: undefined as never,
        string: "" as string,
        number: 0 as number
    }

    export type Defaults = typeof defaults
}
