import type { Evaluate } from "@re-/tools"
import { DictionaryNode } from "../../nodes/structs/dictionary.js"
import { TupleNode } from "../../nodes/structs/tuple.js"
import type { parseFn, ParserContext } from "../common.js"
import { Root } from "../root.js"
import type { MetaDefinition, ParseMetaDefinition } from "./meta.js"
import { isMetaDefinition, parseMetaDefinition } from "./meta.js"

export namespace Obj {
    export type Parse<
        Def,
        Ctx extends ParserContext
    > = Def extends MetaDefinition
        ? ParseMetaDefinition<Def, Ctx>
        : Evaluate<{
              [K in keyof Def]: Root.Parse<Def[K], Ctx>
          }>

    export const parse: parseFn<object> = (def, ctx) => {
        if (Array.isArray(def)) {
            if (isMetaDefinition(def)) {
                return parseMetaDefinition(def, ctx)
            }
            return new TupleNode(
                def.map((itemDef, i) => [
                    i,
                    Root.parse(itemDef, {
                        ...ctx,
                        path: [...ctx.path, String(i)]
                    })
                ]),
                ctx
            )
        }
        return new DictionaryNode(
            Object.entries(def).map(([k, propDef]) => [
                k,
                Root.parse(propDef, {
                    ...ctx,
                    path: [...ctx.path, k]
                })
            ]),
            ctx
        )
    }
}
