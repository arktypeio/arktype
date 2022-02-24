import { NumberKeyword, StringKeyword, NumberLiteral } from "../../builtin"
import { CheckSplittable, ParseConfig, ParseSplittable } from "../internal.js"

export type Comparable = NumberKeyword | StringKeyword

export type Bound = NumberLiteral.Definition

export type Comparator = "<=" | ">=" | ">" | "<"

export namespace Limited {
    export type Definition<
        Inner extends string = string,
        Limit extends string = string
    > = `${Inner}${Comparator}${Limit}`

    export type Check<
        Def extends Definition,
        Root extends string,
        Space
    > = CheckSplittable<Comparator, Def, Root, Space>

    export type Parse<
        Def extends Definition,
        Space,
        Options extends ParseConfig
    > = ParseSplittable<"|", Def, Space, Options>
}
