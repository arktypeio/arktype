import type { Attributes } from "../../attributes/shared.js"
import type { array, dictionary } from "../../internal.js"
import type { Evaluate } from "../../utils/generics.js"
import type { ParserContext, StaticParserContext } from "../common.js"
import { Root } from "../root.js"
import type { TupleExpression } from "./tupleExpression.js"
import { isTupleExpression, parseTupleExpression } from "./tupleExpression.js"

export namespace Structure {
    export type Definition = Kinds[Kind]

    export type Kinds = {
        dictionary: dictionary
        array: array
    }

    export type Kind = keyof Kinds

    export type Parse<
        Def,
        Ctx extends StaticParserContext
    > = Def extends TupleExpression
        ? parseTupleExpression<Def, Ctx>
        : Evaluate<{
              [K in keyof Def]: Root.parse<Def[K], Ctx>
          }>

    export const parse = <kind extends Kind>(
        definition: Kinds[kind],
        kind: kind,
        context: ParserContext
    ): Attributes => {
        const type = Array.isArray(definition) ? "array" : "dictionary"
        if (type === "array" && isTupleExpression(definition as array)) {
            return parseTupleExpression(definition as TupleExpression, context)
        }
        const props: dictionary<Attributes> = {}
        for (const k in definition) {
            props[k] = Root.parse(definition[k], context) as any
        }
        return {
            type,
            props
        }
    }
}
