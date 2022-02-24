import { NumberKeyword, StringKeyword, NumberLiteral } from "../../builtin"
import {
    CheckSplittable,
    InvalidLimitError,
    ParseConfig,
    ParseSplittable,
    UnboundableError,
    UnknownTypeError
} from "../internal.js"

export type Comparable = NumberKeyword | StringKeyword

export type Bound = NumberLiteral.Definition

export type Comparator = "<=" | ">=" | ">" | "<"

export namespace SingleBounded {
    export type Definition<
        Inner extends string = string,
        Limit extends string = string
    > = `${Inner}${Comparator}${Limit}`

    export type Check<
        Def extends Definition,
        Root extends string,
        Space
    > = Def extends Definition<infer Inner, infer Limit>
        ? Inner extends Comparable
            ? Limit extends Bound
                ? Root
                : InvalidLimitError<Inner, Limit>
            : UnboundableError<Inner>
        : UnknownTypeError

    export type Parse<
        Def extends Definition,
        Space,
        Options extends ParseConfig
    > = ParseSplittable<"|", Def, Space, Options>
}
