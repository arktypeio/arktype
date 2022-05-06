import { isRecursible } from "@re-/tools"
import { typeDefProxy, createParser } from "./internal.js"
import { Root } from "../root.js"
import { Map } from "./map.js"
import { Tuple } from "./tuple.js"

export namespace Obj {
    export type FastParse<Def extends object, Dict, Seen> = Def extends any[]
        ? { [I in keyof Def]: Root.FastParse<Def[I], Dict, Seen> }
        : Map.FastParse<Def, Dict, Seen>

    export const type = typeDefProxy as object

    export const parser = createParser(
        {
            type,
            parent: () => Root.parser,
            children: () => [Tuple.delegate, Map.delegate]
        },
        {
            matches: (definition) => isRecursible(definition)
        }
    )

    export const delegate = parser as any as object
}
