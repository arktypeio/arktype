import { Constraint } from "../constraint.js"
import { typeDefProxy, createParser } from "../internal.js"

export namespace NumericConstraint {
    export type Definition<Def extends string = string> = `${Def}`

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Constraint.parse,
            children: () => []
        },
        {
            matches: (def) => true
        }
    )

    export const delegate = parse as any as Definition
}
