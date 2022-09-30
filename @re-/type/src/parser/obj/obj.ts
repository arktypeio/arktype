import type { Evaluate } from "@re-/tools"
import { ObjectLiteral } from "../../nodes/nonTerminal/structural/objectLiteral.js"
import { Tuple } from "../../nodes/nonTerminal/structural/tuple.js"
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
            return new Tuple.Node(
                def.map((itemDef) => Root.parse(itemDef, ctx))
            )
        }
        return new ObjectLiteral.Node(
            Object.values(def).map((child) => Root.parse(child, ctx)),
            Object.keys(def)
        )
    }
}
