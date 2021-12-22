import { Root } from "../root.js"
import {
    ElementOf,
    Iteration,
    ListPossibleTypes,
    RemoveSpaces,
    Split
} from "@re-/tools"
import {
    ParseConfig,
    createParser,
    typeDefProxy,
    UnknownTypeError,
    ValidationErrorMessage,
    ReferencesTypeConfig
} from "./internal.js"
import { Alias } from "./alias"
import { Builtin } from "./builtin"
import { Expression } from "./expression"

export namespace Str {
    export type Definition = string

    export type Format<Def extends string> = RemoveSpaces<Def>

    export type FormatAndCheck<Def extends string, Typespace> = Str.Check<
        Format<Def>,
        Def,
        Typespace
    >

    export type Check<
        Def extends string,
        Root extends string,
        Typespace
    > = Def extends Builtin.Definition
        ? Root
        : Def extends Alias.Definition<Typespace>
        ? Alias.Check<Def, Root, Typespace>
        : Def extends Expression.Definition
        ? Expression.Check<Def, Root, Typespace>
        : UnknownTypeError<Def>

    export type FormatAndParse<
        Def extends string,
        Typespace,
        Options extends ParseConfig
    > = Str.Parse<Format<Def>, Typespace, Options>

    export type Parse<
        Def extends string,
        Typespace,
        Options extends ParseConfig
    > = Str.Check<Def, Def, Typespace> extends ValidationErrorMessage
        ? unknown
        : Def extends Builtin.Definition
        ? Builtin.Parse<Def>
        : Def extends Alias.Definition<Typespace>
        ? Alias.Parse<Def, Typespace, Options>
        : Def extends Expression.Definition
        ? Expression.Parse<Def, Typespace, Options>
        : unknown

    type ControlCharacters = ["|", "?", "(", ")", ",", "[", "]", "=", ">", " "]

    type RawReferences<
        Fragments extends string,
        RemainingControlCharacters extends string[] = ControlCharacters
    > = RemainingControlCharacters extends Iteration<
        string,
        infer Character,
        infer Remaining
    >
        ? RawReferences<ElementOf<Split<Fragments, Character>>, Remaining>
        : Exclude<
              ElementOf<Split<Fragments, RemainingControlCharacters[0]>>,
              ""
          >

    export type References<
        Def extends string,
        Config extends ReferencesTypeConfig,
        Result extends string = RawReferences<`${Def}`> & Config["filter"],
        ListedResult extends string[] = ListPossibleTypes<Result>
    > = Config["asList"] extends true
        ? ListedResult
        : Config["asUnorderedList"] extends true
        ? ListedResult extends [string]
            ? ListedResult
            : Result[]
        : Result

    export const type = typeDefProxy as Definition

    export const parse = createParser(
        {
            type,
            parent: () => Root.parse,
            children: () => [
                Builtin.delegate,
                Alias.delegate,
                Expression.delegate
            ]
        },
        {
            matches: (def) => typeof def === "string",
            // Split by non-alphanumeric, excluding underscore, then remove
            // empty strings leaving aliases and keywords behind
            references: ({ def }) =>
                def.split(/\W/g).filter((fragment) => fragment !== "")
        }
    )

    export const delegate = parse as any as Definition
}
