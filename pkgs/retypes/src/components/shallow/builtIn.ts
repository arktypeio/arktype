import { createNode, createParser } from "../parser.js"
import { Fragment, ExtractableName, UnextractableName } from "."
import { typeDefProxy } from "../../common.js"

export namespace BuiltIn {
    export type Definition<Def extends keyof Map = keyof Map> = Def

    export type Parse<Def extends Definition> = Map[Def]

    export const type = typeDefProxy as Definition

    export const node = createNode({
        type,
        parent: () => Fragment.node,
        matches: (args) => args.definition in map
    })

    export const parser = createParser(
        node,
        ExtractableName.parser,
        UnextractableName.parser
    )

    export const map = {
        ...ExtractableName.map,
        ...UnextractableName.map
    }

    export type Map = typeof map
}
