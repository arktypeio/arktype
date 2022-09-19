import type { Evaluate } from "@re-/tools"
import type { Dictionary } from "../../nodes/structure/dictionary.js"
import { DictionaryNode } from "../../nodes/structure/dictionary.js"
import { TupleNode } from "../../nodes/structure/tuple.js"
import type { parseFn } from "../common.js"
import type { Root } from "../root.js"

export namespace Obj {
    export type Parse<Def, Dict> = Evaluate<{
        [K in keyof Def]: Root.Parse<Def[K], Dict>
    }>

    export const parse: parseFn<object> = (def, ctx) => {
        if (Array.isArray(def)) {
            return new TupleNode(def, ctx)
        }
        return new DictionaryNode(def as Dictionary.Definition, ctx)
    }
}
