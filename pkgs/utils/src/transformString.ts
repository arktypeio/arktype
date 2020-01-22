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

export const capitalize = (word: string) =>
    transformSubstring({
        original: word,
        transform: _ => _.toUpperCase(),
        end: 1
    })

export const lettersAfterFirstToLower = (word: string) =>
    transformSubstring({
        original: word,
        transform: _ => _.toLowerCase(),
        start: 1
    })

export const capsCase = (words: string[]) =>
    words.map(word => capitalize(lettersAfterFirstToLower(word))).join("")
