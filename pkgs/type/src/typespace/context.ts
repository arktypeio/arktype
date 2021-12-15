import { Evaluate, IsAny } from "@re-/utils"
import { ParsedType } from "../parse.js"
import { ParseConfig } from "./internal.js"
import { Resolution } from "./resolution.js"
import { Root, Map } from "../definition"

export namespace TypeSpace {
    export type Definition<Def extends Map.Definition = Map.Definition> =
        Map.Definition<Def>

    export type Validate<Typespace> = IsAny<Typespace> extends true
        ? any
        : Evaluate<{
              [TypeName in keyof Typespace]: Resolution.Validate<
                  Typespace[TypeName],
                  Typespace
              >
          }>

    export type Parse<Typespace, Options extends ParseConfig> = {
        [TypeName in keyof Typespace]: ParsedType<
            Typespace[TypeName],
            Validate<Typespace>,
            Options
        >
    }

    export type ParseEach<Typespace, Options extends ParseConfig> = {
        [TypeName in keyof Typespace]: ParsedType<
            Typespace[TypeName],
            Validate<Typespace>,
            Options
        >
    }
}
