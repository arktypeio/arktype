import { Root } from "../root.js"
import {
    ElementOf,
    Iteration,
    ListPossibleTypes,
    narrow,
    RemoveSpaces,
    Split,
    StringReplace
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
import { Builtin, Keyword, Literal } from "./builtin"
import { Expression } from "./expression"

export namespace Str {
    export type Definition = string

    export type Format<Def extends string> = RemoveSpaces<
        StringReplace<Def, `"`, `'`>
    >

    export type FormatAndCheck<Def extends string, Typespace> = Str.Check<
        Format<Def>,
        Def,
        Typespace
    >

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
    export type Check<
        Def extends string,
        Root extends string,
        Typespace
    > = Def extends Keyword.Definition
        ? Root
        : Def extends Alias.Definition<Typespace>
        ? Alias.Check<Def, Root, Typespace>
        : Def extends Expression.Definition
        ? Expression.Check<Def, Root, Typespace>
        : Def extends Literal.Definition
        ? Root
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
        : Def extends Keyword.Definition
        ? Keyword.Parse<Def>
        : Def extends Alias.Definition<Typespace>
        ? Alias.Parse<Def, Typespace, Options>
        : Def extends Expression.Definition
        ? Expression.Parse<Def, Typespace, Options>
        : Def extends Literal.Definition
        ? Literal.Parse<Def>
        : unknown

    export const controlCharacters = narrow([
        "|",
        "?",
        "(",
        ")",
        ",",
        "[",
        "]",
        "=>"
    ])

    export const controlCharacterMatcher = RegExp(
        // All control characters need to be escaped in a regex expression
        controlCharacters.map((char) => `\\${char}`).join("|"),
        "g"
    )

    export type ControlCharacters = typeof controlCharacters

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
                Expression.delegate,
                Builtin.delegate,
                Alias.delegate
            ]
        },
        {
            matches: (def) => typeof def === "string",
            // Split by control characters, then remove
            // empty strings leaving aliases and builtins behind
            references: ({ def }) =>
                def
                    .split(controlCharacterMatcher)
                    .filter((fragment) => fragment !== "")
        }
    )

    export const delegate = parse as any as Definition
}
