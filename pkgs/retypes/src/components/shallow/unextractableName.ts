import { createParser } from "../parser.js"
import { BuiltIn } from "./builtIn.js"
import { typeDefProxy } from "../../common.js"

export namespace UnextractableName {
    export type Definition<Def extends keyof Map = keyof Map> = Def

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => BuiltIn.parse,
        matches: (definition) => definition in map,
        implements: {}
    })

    export const delegate = parse as any as Definition

    /**
     * These types can be used to specify a type definition but
     * will never be used to represent a value at runtime, either
     * because they are abstract type constructs (e.g. "never") or
     * because a more specific type will always be extracted (e.g.
     * "boolean", which will always evaluate as "true" or "false")
     */
    export const map = {
        unknown: typeDefProxy as unknown,
        any: typeDefProxy as any,
        object: typeDefProxy as object,
        boolean: typeDefProxy as boolean,
        void: typeDefProxy as void,
        never: typeDefProxy as never,
        string: typeDefProxy as string,
        number: typeDefProxy as number
    }

    export type Map = typeof map
}
