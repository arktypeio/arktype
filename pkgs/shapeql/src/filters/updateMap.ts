import { isRecursible, fromEntries, ValueOf, NonRecursible } from "@re-do/utils"

export type UpdateFunction<T> = (value: T) => T

export type Update<T> = T | UpdateFunction<T>

// TODO: Expand to be able to update each item in an array
export type DeepUpdate<T> = {
    [P in keyof T]?: T[P] extends NonRecursible | any[]
        ? Update<T[P]>
        : DeepUpdate<T[P]>
}

export const updateMap = <T>(current: T, updater: DeepUpdate<T>): T => {
    return fromEntries(
        Object.entries(current).map(([k, v]) => {
            if (k in updater) {
                const key = k as keyof T
                if (typeof updater[key] === "function") {
                    const update = (updater[key] as any) as UpdateFunction<
                        ValueOf<T>
                    >
                    return [k, update(v)]
                } else {
                    return isRecursible(v) && !Array.isArray(updater[key])
                        ? Array.isArray(v)
                            ? [
                                  k,
                                  v.map(item =>
                                      updateMap(item, updater[key] as any)
                                  )
                              ]
                            : [k, updateMap(v, updater[key] as any)]
                        : [k, updater[key]]
                }
            } else {
                return [k, v]
            }
        })
    ) as T
}
