import {
    ElementOf,
    FilterFunction,
    Iterate,
    IterateType,
    List,
    ListPossibleTypes,
    Stringifiable
} from "./common.js"

export const alphaOnlyRegex = /^[A-Za-z]+$/

export const digitsOnlyRegex = /^\d+$/

// https://stackoverflow.com/questions/2811031/decimal-or-numeric-values-in-regular-expression-validation
export const numericRegex = /^-?(0|[1-9]\d*)(\.\d+)?$/

export const integerRegex = /^-?(0|[1-9]\d*)$/

export const alphaNumericRegex = /^[\dA-Za-z]+$/

export const isAlpha = (s: string) => alphaOnlyRegex.test(s)

export const isDigits = (s: string) => digitsOnlyRegex.test(s)

export type NumericString<N extends number = number> = `${N}`

export const isNumeric = (s: any) => numericRegex.test(s)

export const isInteger = (s: any) => integerRegex.test(s)

export type AsNumberOptions = {
    asFloat?: boolean
    assert?: boolean
}

export type StringOrNumberFrom<
    K,
    Original = K & (string | number)
> = Original extends number
    ? Original | `${Original}`
    : Original extends NumericString<infer Value>
    ? Value | Original
    : Original

export const asNumber = <Options extends AsNumberOptions>(
    s: any,
    options?: Options
): number | (Options["assert"] extends true ? never : null) => {
    if (isNumeric(s)) {
        const parsable = String(s)
        const asFloat = options?.asFloat ?? parsable.includes(".")
        const parser = asFloat ? Number.parseFloat : Number.parseInt
        const result = parser(parsable)
        if (!Number.isNaN(result)) {
            return result
        }
    }
    if (options?.assert) {
        throw new Error(`'${s}' cannot be converted to a number.`)
    }
    return null as any
}

export const isAlphaNumeric = (s: string) => alphaNumericRegex.test(s)

export const filterChars = (s: string, charFilter: FilterFunction<string>) =>
    [...s].filter(charFilter).join("")

type TransformSubstringOptions = {
    original: string
    transform: (original: string) => string
    start?: number
    end?: number
}

export const transformSubstring = ({
    original,
    transform,
    start,
    end
}: TransformSubstringOptions) =>
    `${start ? original.slice(0, start) : ""}${transform(
        original.slice(start, end)
    )}${end ? original.slice(end) : ""}`

export const camelCase = (words: string[]) =>
    `${words[0].toLowerCase()}${capsCase(words.slice(1))}`

export const capitalize = <W extends string>(word: W) =>
    transformSubstring({
        original: word,
        transform: (_) => _.toUpperCase(),
        end: 1
    }) as Capitalize<W>

export const uncapitalize = <W extends string>(word: W) =>
    transformSubstring({
        original: word,
        transform: (_) => _.toLowerCase(),
        end: 1
    }) as Uncapitalize<W>

export const lettersAfterFirstToLower = (word: string) =>
    transformSubstring({
        original: word,
        transform: (_) => _.toLowerCase(),
        start: 1
    })

export const capsCase = (words: string[]) =>
    words.map((word) => capitalize(lettersAfterFirstToLower(word))).join("")

export type StringReplace<
    Original extends string,
    Find extends string,
    ReplaceWith extends string
> = Original extends `${infer Left}${Find}${infer Right}`
    ? StringReplace<`${Left}${ReplaceWith}${Right}`, Find, ReplaceWith>
    : Original

export type Split<
    S extends string,
    Delimiter extends string,
    IncludeDelimiter extends boolean = false,
    Result extends string[] = []
> = S extends `${infer Left}${Delimiter}${infer Right}`
    ? Split<
          Right,
          Delimiter,
          IncludeDelimiter,
          [
              ...Result,
              ...(IncludeDelimiter extends true ? [Left, Delimiter] : [Left])
          ]
      >
    : [...Result, S]

/**
 * Iteratively split a string literal type using a tuple of delimiters
 */
export type Spliterate<
    S extends string,
    Delimiters extends string[],
    IncludeDelimiters extends boolean = false
> = UnpackNestedTuples<
    SpliterateRecurse<[S], Delimiters, IncludeDelimiters, []>
>

type SpliterateRecurse<
    Fragments extends string[],
    Delimiters extends string[],
    IncludeDelimiters extends boolean,
    PreviousDelimiters extends string[]
> = Delimiters extends IterateType<
    string,
    infer CurrentDelimiter,
    infer RemainingDelimiters
>
    ? {
          [I in keyof Fragments]: Fragments[I] extends string
              ? Fragments[I] extends ElementOf<PreviousDelimiters>
                  ? Fragments[I]
                  : SpliterateRecurse<
                        Split<
                            Fragments[I],
                            CurrentDelimiter,
                            IncludeDelimiters
                        >,
                        RemainingDelimiters,
                        IncludeDelimiters,
                        [...PreviousDelimiters, CurrentDelimiter]
                    >
              : never
      }
    : Fragments

type UnpackNestedTuples<
    T extends List,
    Result extends unknown[] = []
> = T extends Iterate<infer Current, infer Remaining>
    ? Current extends List
        ? [...UnpackNestedTuples<Current>, ...UnpackNestedTuples<Remaining>]
        : [Current, ...UnpackNestedTuples<Remaining>]
    : Result

export type Join<
    Segments extends Stringifiable[],
    Delimiter extends string,
    Result extends string = ""
> = Segments extends IterateType<Stringifiable, infer Segment, infer Remaining>
    ? Join<
          Remaining,
          Delimiter,
          `${Result}${Result extends "" ? "" : Delimiter}${Segment}`
      >
    : Result

export type RemoveSpaces<FromString extends string> = StringReplace<
    FromString,
    " ",
    ""
>

export type StringifyPossibleTypes<
    U extends Stringifiable,
    Delimiter extends string = ", "
> = Join<ListPossibleTypes<U>, Delimiter>

export type ListChars<
    S extends string,
    Result extends string[] = []
> = S extends `${infer Char}${infer Remaining}`
    ? ListChars<Remaining, [...Result, Char]>
    : Result
