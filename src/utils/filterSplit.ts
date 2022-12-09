import type { List } from "./generics.js"

export const filterSplit = <
    item,
    included extends item,
    excluded extends item = Exclude<item, included>
>(
    list: List<item>,
    by: (item: item) => item is included
) => {
    const result: [included: included[], excluded: excluded[]] = [[], []]
    for (const item of list) {
        if (by(item)) {
            result[0].push(item)
        } else {
            result[1].push(item as any)
        }
    }
    return result
}
