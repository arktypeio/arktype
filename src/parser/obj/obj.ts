import { Attributes } from "../../attributes/attributes.js"
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

    export const parse: parseFn<Record<string | number, unknown>> = (
        def,
        ctx
    ) => {
        if (Array.isArray(def)) {
            if (isTupleExpression(def)) {
                return parseTupleExpression(def, ctx)
            }
        }
        const props: Record<string | number, Attributes> = {}
        for (const k in def) {
            props[k] = Root.parse(def[k], ctx)
        }
        return Attributes.initialize({
            type: Array.isArray(def) ? "array" : "object",
            props
        })
    }
}
