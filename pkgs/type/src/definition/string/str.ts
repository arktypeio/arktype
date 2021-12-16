import { RemoveSpaces } from "@re-/utils"
import { typeDefProxy, createParser, ParseConfig } from "./internal.js"
import { Fragment } from "./fragment.js"
import { Optional } from "./expression/optional.js"
import { Root } from "../root.js"

export namespace Str {
    export type Definition<Def extends string = string> = Def

    export type Validate<
        Def extends string,
        Typespace,
        ParsableDefinition extends string = RemoveSpaces<Def>
    > = Fragment.Validate<
        ParsableDefinition extends Optional.Definition<infer OptionalDef>
            ? OptionalDef
            : ParsableDefinition,
        Def,
        Typespace
    >

    export type Parse<
        Def extends string,
        Typespace,
        Options extends ParseConfig,
        ParsableDefinition extends string = RemoveSpaces<Def>
    > = ParsableDefinition extends Optional.Definition<infer OptionalDef>
        ? Fragment.Parse<OptionalDef, Typespace, Options> | undefined
        : Fragment.Parse<ParsableDefinition, Typespace, Options>

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Root.parse,
            children: () => [Optional.delegate, Fragment.delegate]
        },
        {
            matches: (definition) => typeof definition === "string"
        }
    )

    export const delegate = parse as any as Definition
}
