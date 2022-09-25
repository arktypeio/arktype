import type { Evaluate } from "@re-/tools"
import { DictionaryNode } from "../../nodes/structs/dictionary.js"
import { TupleNode } from "../../nodes/structs/tuple.js"
import type { parseFn } from "../common.js"
import { Root } from "../root.js"
import type {
    MetaDefinition,
    ParseMetaDefinition,
    ValidateMetaDefinition
} from "./meta.js"
import { isMetaDefinition, parseMetaDefinition } from "./meta.js"

export namespace Obj {
    export type Validate<Def, Space> = Def extends MetaDefinition<
        infer Left,
        infer Token,
        infer Args
    >
        ? ValidateMetaDefinition<Left, Token, Args, Space>
        : {
              [K in keyof Def]: Root.Validate<Def[K], Space>
          }

    export type Parse<Def, Space> = Def extends MetaDefinition<
        infer Left,
        infer Token,
        infer Args
    >
        ? ParseMetaDefinition<Left, Token, Args, Space>
        : Evaluate<{
              [K in keyof Def]: Root.Parse<Def[K], Space>
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
