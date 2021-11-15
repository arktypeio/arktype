import { createParser } from "../parser.js"
import { Fragment } from "./fragment.js"
import { ExtractableName } from "./extractableName.js"
import { UnextractableName } from "./unextractableName.js"
import { typeDefProxy } from "../../common.js"

export namespace BuiltIn {
    export type Definition<Def extends keyof Map = keyof Map> = Def

    export type Parse<Def extends Definition> = Map[Def]

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Fragment.parse,
        matches: (definition) => definition in map,
        children: () => [ExtractableName.delegate, UnextractableName.delegate]
    })

    export const delegate = parse as any as Definition

    export const map = {
        ...ExtractableName.map,
        ...UnextractableName.map
    }

    export type Map = typeof map
}
