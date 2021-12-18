export const randomInRange = (min: number, max: number) =>
    Math.floor(Math.random() * (max - min + 1)) + min

export const randomFromList = <T>(list: T[]) =>
    list[randomInRange(0, list.length - 1)]

export const randomsFromList = <T>(list: T[], count: number) =>
    [...Array(count)].map((_) => randomFromList(list))

export const randomFromSeed = (seed: any, min: number, max: number) =>
    (Math.abs(
        JSON.stringify(seed)
            .split("")
            .reduce((hash, char) => {
                const updated = (hash << 5) - hash + char.charCodeAt(0)
                return updated & updated
            }, 0)
    ) %
        (max - min + 1)) +
    min

export const randomRgbFromSeed = (seed: any) => {
    const red = randomFromSeed({ red: seed }, 0, 255)
    const green = randomFromSeed({ green: seed }, 0, 255)
    const blue = randomFromSeed({ blue: seed }, 0, 255)
    return `rgb(${red}, ${green}, ${blue})`
}
