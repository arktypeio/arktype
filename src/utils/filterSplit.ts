import type { List } from "./generics.js"

export const filterSplit = <item, included extends item>(
    list: List<item>,
    by: (item: item) => item is included
) => {
    const result: [included: included[], excluded: Exclude<item, included>[]] =
        [[], []]
    for (const item of list) {
        if (by(item)) {
            result[0].push(item)
        } else {
            result[1].push(item as any)
        }
    }
    return result
}
