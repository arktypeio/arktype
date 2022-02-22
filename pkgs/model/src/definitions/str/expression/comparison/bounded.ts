import { NumberKeyword, StringKeyword, NumberLiteral } from "../../builtin"
import {
    typeDefProxy,
    CheckSplittable,
    ParseConfig,
    ParseSplittable
} from "../internal.js"

export type Comparable = NumberKeyword | StringKeyword

export type Bound = NumberLiteral.Definition

export type Comparator = "<=" | ">=" | ">" | "<"

// number<5 number>7
// 3<number<5

export namespace Bounded {
    export type Definition<
        Lower extends string = string,
        Inner extends string = string,
        Upper extends string = string
    > = `${Lower}${Comparator}${Inner}${Comparator}${Upper}`

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
