import { Str } from "../str.js"
import { Constraint } from "./constraint.js"
import { createParser, typeDefProxy } from "./internal.js"
import { Intersection } from "./intersection.js"
import { List } from "./list.js"
import { Union } from "./union.js"

export namespace Expression {
    export const type = typeDefProxy as string

    export const parser = createParser({
        type,
        parent: () => Str.parser,
        children: () => [
            Intersection.delegate,
            Union.delegate,
            Constraint.delegate,
            List.delegate
        ]
    })

    export const delegate = parser as any as string
}
