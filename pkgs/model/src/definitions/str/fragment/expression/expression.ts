import {
    ParseConfig,
    createParser,
    typeDefProxy,
    UnknownTypeError
} from "./internal.js"
import { ArrowFunction } from "./arrowFunction.js"
import { List } from "./list.js"
import { Union } from "./union.js"
import { Fragment } from "../fragment.js"

export namespace Expression {
    export type Definition =
        | ArrowFunction.Definition
        | Union.Definition
        | List.Definition

    export type Check<
        Def extends string,
        Root extends string,
        Space
    > = Def extends ArrowFunction.Definition<infer Parameters, infer Return>
        ? ArrowFunction.Check<Parameters, Return, Root, Space>
        : Def extends Union.Definition
        ? Union.Check<Def, Root, Space>
        : Def extends List.Definition<infer ListItem>
        ? Fragment.Check<ListItem, Root, Space>
        : UnknownTypeError<Def>

    export type Parse<
        Def extends string,
        Space,
        Options extends ParseConfig
    > = Def extends ArrowFunction.Definition<infer Parameters, infer Return>
        ? ArrowFunction.Parse<Parameters, Return, Space, Options>
        : Def extends Union.Definition
        ? Union.Parse<Def, Space, Options>
        : Def extends List.Definition<infer ListItem>
        ? Fragment.Parse<ListItem, Space, Options>[]
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser({
        type,
        parent: () => Fragment.parse,
        children: () => [ArrowFunction.delegate, Union.delegate, List.delegate]
    })

    export const delegate = parse as any as Definition
}
