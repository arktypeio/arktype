import {
    ParseConfig,
    createParser,
    typeDefProxy,
    UnknownTypeError,
    ExpressionToken,
    expressionTokenMatcher
} from "./internal.js"
import { ArrowFunction } from "./arrowFunction.js"
import { List } from "./list.js"
import { Or } from "./or.js"
import { Fragment } from "../fragment.js"

type Z = "string|number" extends Expression.Definition ? true : false

export namespace Expression {
    export type Definition = `${string}${ExpressionToken}${string}`

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
            matches: (def) => !!def.match(expressionTokenMatcher)
        }
    )

    export const delegate = parse as any as Definition
}
