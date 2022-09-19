import type { Evaluate } from "@re-/tools"
import type { Dictionary } from "../../nodes/structures/dictionary.js"
import { DictionaryNode } from "../../nodes/structures/dictionary.js"
import { TupleNode } from "../../nodes/structures/tuple.js"
import type { parseFn } from "../common.js"
import type { Root } from "../root.js"
import {
    isParameterizedDefinition,
    parseParameterizedDefinition
} from "./parameterized.js"

export namespace Obj {
    export type Validate<Def, Dict> = {
        [K in keyof Def]: Root.Validate<Def[K], Dict>
    }

    export type Parse<Def, Dict> = Evaluate<{
        [K in keyof Def]: Root.Parse<Def[K], Dict>
    }>

    export const parse: parseFn<object> = (def, ctx) => {
        if (Array.isArray(def)) {
            if (isParameterizedDefinition(def)) {
                return parseParameterizedDefinition(def, ctx)
            }
            return new TupleNode(def, ctx)
        }
        return new DictionaryNode(def as Dictionary.Definition, ctx)
    }
}
