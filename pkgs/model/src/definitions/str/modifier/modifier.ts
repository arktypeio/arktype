import {
    ParseConfig,
    createParser,
    typeDefProxy,
    UnknownTypeError,
    ModifierString
} from "./internal.js"
import { Fragment } from "../fragment/fragment.js"
import { Optional } from "./optional.js"

export namespace Modifier {
    export type Definition<
        Modified extends string = string,
        Modifiers extends ModifierString = ModifierString
    > = `${Modified}${Modifiers}`

    export type Check<Root extends Definition, Space> = Root extends Definition<
        infer Modified,
        infer Modifiers
    >
        ? Fragment.Check<Modified, Root, Space>
        : UnknownTypeError<Root>

    export type Parse<
        Root extends Definition,
        Space,
        Options extends ParseConfig
    > = Root extends Optional.Definition<infer Inner>
        ? Fragment.Parse<Inner, Space, Options> | undefined
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Fragment.parse,
        children: () => [Optional.delegate]
    })

    export const delegate = parse as any as Definition
}
