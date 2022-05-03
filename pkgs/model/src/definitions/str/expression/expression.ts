import { createParser, typeDefProxy, Precedence } from "./internal.js"
import { ArrowFunction } from "./arrowFunction.js"
import { List } from "./list.js"
import { Union } from "./union.js"
import { Str } from "../str.js"
import { Constraint } from "./constraint.js"
import { Intersection } from "./intersection.js"
import { DeepNode, ParseNode } from "../internal.js"

export namespace Expression {
    export type Parse<Def extends string, Resolutions, Context> = Precedence<
        [
            ArrowFunction.Parse<Def, Resolutions, Context>,
            Union.Parse<Def, Resolutions, Context>,
            Intersection.Parse<Def, Resolutions, Context>,
            Constraint.Parse<Def, Resolutions, Context>,
            List.Parse<Def, Resolutions, Context>
        ]
    >

    export const type = typeDefProxy as string

    export const parser = createParser({
        type,
        parent: () => Str.parser,
        children: () => [
            ArrowFunction.delegate,
            Union.delegate,
            Intersection.delegate,
            Constraint.delegate,
            List.delegate
        ]
    })

    export const delegate = parser as any as string
}
