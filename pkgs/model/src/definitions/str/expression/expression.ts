import {
    ParseConfig,
    createParser,
    typeDefProxy,
    UnknownTypeError,
    NonIdentifyingToken,
    nonIdentifyingTokenMatcher
} from "./internal.js"
import { ArrowFunction } from "./arrowFunction.js"
import { List } from "./list.js"
import { Or } from "./or.js"
import { Fragment } from "../fragment.js"

export namespace Expression {
    export type Definition = `${string}${NonIdentifyingToken}${string}`

    export type Check<
        Def extends string,
        Root extends string,
        Space
    > = Def extends ArrowFunction.Definition<infer Parameters, infer Return>
        ? ArrowFunction.Check<Parameters, Return, Root, Space>
        : Def extends Or.Definition
        ? Or.Check<Def, Root, Space>
        : Def extends List.Definition<infer ListItem>
        ? Fragment.Check<ListItem, Root, Space>
        : UnknownTypeError<Def>

    export type Parse<
        Def extends string,
        Space,
        Options extends ParseConfig
    > = Def extends ArrowFunction.Definition<infer Parameters, infer Return>
        ? ArrowFunction.Parse<Parameters, Return, Space, Options>
        : Def extends Or.Definition
        ? Or.Parse<Def, Space, Options>
        : Def extends List.Definition<infer ListItem>
        ? Fragment.Parse<ListItem, Space, Options>[]
        : unknown

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Fragment.parse,
            children: () => [ArrowFunction.delegate, Or.delegate, List.delegate]
        },
        {
            // Any string containing a control character will be interpreted as an expression
            matches: (def) => !!def.match(nonIdentifyingTokenMatcher)
        }
    )

    export const delegate = parse as any as Definition
}
