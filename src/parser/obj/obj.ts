import { ObjectLiteral } from "../../nodes/structural/objectLiteral.js"
import { Tuple } from "../../nodes/structural/tuple.js"
import type { Evaluate } from "../../utils/generics.js"
import type { parseFn, ParserContext } from "../common.js"
import { Root } from "../root.js"
import type { TupleExpression } from "./tupleExpression.js"
import { isTupleExpression, parseTupleExpression } from "./tupleExpression.js"

export namespace Obj {
    export type Parse<
        Def,
        Ctx extends ParserContext
    > = Def extends TupleExpression
        ? parseTupleExpression<Def, Ctx>
        : Evaluate<{
              [K in keyof Def]: Root.parse<Def[K], Ctx>
          }>

    export const parse: parseFn<object> = (def, ctx) => {
        if (Array.isArray(def)) {
            if (isTupleExpression(def)) {
                return parseTupleExpression(def, ctx)
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
