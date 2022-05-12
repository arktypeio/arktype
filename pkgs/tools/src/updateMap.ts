import {
    isRecursible,
    fromEntries,
    PropertyOf,
    NonRecursible
} from "./common.ts"

export type UpdateFunction<T> = (currentValue: T) => T

export type ShallowUpdate<T> = T | UpdateFunction<T>

// TODO: Expand to be able to update each item in an array
export type DeepUpdate<T> = {
    [P in keyof T]?: T[P] extends NonRecursible | any[]
        ? ShallowUpdate<T[P]>
        : DeepUpdate<T[P]>
}

export const updateMap = <T>(obj: T, updates: DeepUpdate<T>): T => {
    const recurse = (currentObj: any, currentUpdates: any): any => {
        const keys = Object.keys({ ...currentObj, ...currentUpdates })
        return fromEntries(
            keys.map((k) => {
                const currentValue = currentObj[k]
                const updaterValue = currentUpdates[k]
                if (!(k in currentUpdates)) {
                    return [k, currentValue]
                }
                if (typeof updaterValue === "function") {
                    const update = updaterValue as UpdateFunction<PropertyOf<T>>
                    return [k, update(currentValue)]
                } else {
                    return isRecursible(currentValue) &&
                        isRecursible(updaterValue) &&
                        !Array.isArray(updaterValue)
                        ? Array.isArray(currentValue)
                            ? [
                                  k,
                                  currentValue.map((item) =>
                                      recurse(item, updaterValue)
                                  )
                              ]
                            : [k, recurse(currentValue, updaterValue)]
                        : [k, updaterValue]
                }
            })
        )
    }
    return recurse(obj, updates)
}
