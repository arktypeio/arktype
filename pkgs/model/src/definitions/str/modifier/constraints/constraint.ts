import { Modifier } from "../modifier.js"
import { typeDefProxy, createParser } from "../internal.js"
import { NumericConstraint } from "./numeric/numericConstraint.js"
import { StringConstraint } from "./string/stringConstraint.js"

export namespace Constraint {
    export type Definition<Def extends string = string> = `${Def}`

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Modifier.parse,
            children: () => [
                NumericConstraint.delegate,
                StringConstraint.delegate
            ]
        },
        {
            matches: (def) => true
        }
    )

    export const delegate = parse as any as Definition
}
