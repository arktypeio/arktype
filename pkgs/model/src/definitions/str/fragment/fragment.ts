import {
    ParseConfig,
    createParser,
    typeDefProxy,
    UnknownTypeError
} from "../internal.js"
import { Reference } from "./reference/index.js"
import { Expression } from "./expression/index.js"
import { Str } from "../str.js"

export namespace Fragment {
    export type Definition = string

    /**
     * Expressions have the highest precedence when determining how to parse
     * a string definition. However, as of TS4.5, checking whether Def
     * is an Expression before checking whether it is a Keyword or Alias
     * inexplicably results in an infinite depth type error for Check
     * on the first definition containing an Alias in any given file. Subsequent
     * definitions, even if identical, have no errors.
     *
     * To work around this, Builtin is split into Keyword, which is checked first,
     *  and Literal, which is checked after Expression. This is to ensure that
     * a definition like "'yes'|'no'" are not interpreted as the StringLiteral
     * matching "yes'|'no".
     */
    // export type Check<
    //     Def extends string,
    //     Root extends string,
    //     Space
    // > = Def extends Keyword.Definition
    //     ? Root
    //     : Def extends Alias.Definition<Space>
    //     ? Alias.Check<Def, Root, Space>
    //     : Def extends Expression.Definition
    //     ? Expression.Check<Def, Root, Space>
    //     : Def extends Literal.Definition
    //     ? Root
    //     : Def extends RegexLiteral.Definition
    //     ? Root
    //     : UnknownTypeError<Def>

    // export type Parse<
    //     Def extends string,
    //     Space,
    //     Options extends ParseConfig
    // > = Def extends Keyword.Definition
    //     ? Keyword.Parse<Def>
    //     : Def extends Alias.Definition<Space>
    //     ? Alias.Parse<Def, Space, Options>
    //     : Def extends Expression.Definition
    //     ? Expression.Parse<Def, Space, Options>
    //     : Def extends Literal.Definition
    //     ? Literal.Parse<Def>
    //     : unknown

    export type Parse<
        Def extends string,
        Space
    > = Def extends Reference.Definition<Space>
        ? Def
        : Def extends Expression.Definition
        ? Expression.Parse<Def, Space>
        : UnknownTypeError<Def>

    export type Node = Expression.Node | string

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Str.parse,
            children: () => [Reference.delegate, Expression.delegate]
        },
        {
            matches: (def) => typeof def === "string"
        }
    )

    export const delegate = parse as any as Definition
}
