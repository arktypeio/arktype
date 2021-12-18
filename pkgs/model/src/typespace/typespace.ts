import { Evaluate, IsAny } from "@re-/tools"
import { ParsedType } from "../parse.js"
import { ParseConfig } from "./internal.js"
import { Resolution } from "./resolution.js"
import { Root } from "../definition"

export namespace Typespace {
    export type Definition = Record<string, Root.Definition>

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
