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

export const camelCase = (words: string[]) => {
    const firstWord = words[0].toLowerCase()
    const followingWords = words
        .slice(1)
        .map(original => {
            const withFirstLetterToUpper = transformSubstring({
                original,
                transform: _ => _.toUpperCase(),
                end: 1
            })
            return transformSubstring({
                original: withFirstLetterToUpper,
                transform: _ => _.toLowerCase(),
                start: 1
            })
        })
        .join("")
    return `${firstWord}${followingWords}`
}
