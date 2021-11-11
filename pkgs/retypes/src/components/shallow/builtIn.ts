import { createNode, createParser } from "../parser.js"
import { Fragment, Extractable, Unextractable } from "."
import { typeDefProxy } from "../../common.js"

export namespace BuiltIn {
    export type Definition<Def extends keyof Map = keyof Map> = Def

    export type Parse<Def extends Definition> = Map[Def]

    export const type = typeDefProxy as Definition

    export const node = createNode({
        type,
        parent: Fragment.node,
        matches: (args) => args.definition in map
    })

    export const parser = createParser(
        node,
        Extractable.parser,
        Unextractable.parser
    )

    export const map = {
        ...Extractable.map,
        ...Unextractable.map
    }

    export type Map = typeof map
}
