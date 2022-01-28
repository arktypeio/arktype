import {
    ElementOf,
    Iteration,
    ListPossibleTypes,
    RemoveSpaces,
    Split,
    StringReplace
} from "@re-/tools"
import { Root } from "../root.js"
import {
    ParseConfig,
    createParser,
    typeDefProxy,
    ReferencesTypeConfig,
    NonIdentifyingTokens,
    nonIdentifyingTokenMatcher,
    ValidationErrorMessage
} from "./internal.js"
import { Fragment } from "./fragment.js"

export namespace Str {
    export type Definition = string

    export type Format<Def extends string> = RemoveSpaces<Def>
    //     StringReplace<Def, `"`, `'`>
    // >

    export type Check<Def extends string, Space> = Fragment.Check<
        Format<Def>,
        Def,
        Space
    >

    export type Parse<
        Def extends string,
        Space,
        Options extends ParseConfig
    > = Str.Check<Def, Space> extends ValidationErrorMessage
        ? unknown
        : Fragment.Parse<Format<Def>, Space, Options>

    type RawReferences<
        Fragments extends string,
        RemainingNonIdentifiers extends string[] = [
            ...NonIdentifyingTokens,
            " "
        ]
    > = RemainingNonIdentifiers extends Iteration<
        string,
        infer Character,
        infer Remaining
    >
        ? RawReferences<ElementOf<Split<Fragments, Character>>, Remaining>
        : Exclude<ElementOf<Split<Fragments, RemainingNonIdentifiers[0]>>, "">

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
            children: () => [Fragment.delegate]
        },
        {
            matches: (def) => typeof def === "string",
            // Split by control characters, then remove
            // empty strings leaving aliases and builtins behind
            references: ({ def }) =>
                def
                    .split(nonIdentifyingTokenMatcher)
                    .filter((fragment) => fragment !== "")
        }
    )

    export const delegate = parse as any as Definition
}
