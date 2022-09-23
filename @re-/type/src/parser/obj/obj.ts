import type { Evaluate } from "@re-/tools"
import { DictionaryNode } from "../../nodes/structs/dictionary.js"
import { TupleNode } from "../../nodes/structs/tuple.js"
import type { parseFn } from "../common.js"
import { Root } from "../root.js"
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

    export const parse: parseFn<object> = (definition, context) => {
        if (Array.isArray(definition)) {
            if (isParameterizedDefinition(definition)) {
                return parseParameterizedDefinition(definition, context)
            }
            return new TupleNode(
                definition.map((itemDef, i) => [
                    i,
                    Root.parse(itemDef, {
                        ...context,
                        path: [...context.path, String(i)]
                    })
                ]),
                context
            )
        }
        return new DictionaryNode(
            Object.entries(definition).map(([k, propDef]) => [
                k,
                Root.parse(propDef, {
                    ...context,
                    path: [...context.path, k]
                })
            ]),
            context
        )
    }
}
