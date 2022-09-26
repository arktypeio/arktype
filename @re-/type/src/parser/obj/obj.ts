import type { Evaluate } from "@re-/tools"
import { DictionaryNode } from "../../nodes/structs/dictionary.js"
import { TupleNode } from "../../nodes/structs/tuple.js"
import type { Space } from "../../space/parse.js"
import type { parseFn } from "../common.js"
import { Root } from "../root.js"
import type {
    MetaDefinition,
    ParseMetaDefinition,
    ValidateMetaDefinition
} from "./meta.js"
import { isMetaDefinition, parseMetaDefinition } from "./meta.js"

export namespace Obj {
    export type Validate<
        D,
        S extends Space.Definition
    > = D extends MetaDefinition<infer Left, infer Token, infer Args>
        ? ValidateMetaDefinition<Left, Token, Args, S>
        : {
              [K in keyof D]: Root.Validate<D[K], S>
          }

    export type Parse<D, S extends Space.Definition> = D extends MetaDefinition<
        infer Left,
        infer Token,
        infer Args
    >
        ? ParseMetaDefinition<Left, Token, Args, S>
        : Evaluate<{
              [K in keyof D]: Root.Parse<D[K], S>
          }>

    export const parse: parseFn<object> = (definition, context) => {
        if (Array.isArray(definition)) {
            if (isMetaDefinition(definition)) {
                return parseMetaDefinition(definition, context)
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
