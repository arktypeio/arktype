import { isRecursible, fromEntries, ValueOf, NonRecursible } from "./common"

export type UpdateFunction<T> = (currentValuealue: T) => T

export type ShallowUpdate<T> = T | UpdateFunction<T>

// TODO: Expand to be able to update each item in an array
export type DeepUpdate<T> = {
    [P in keyof T]?: T[P] extends NonRecursible | any[]
        ? ShallowUpdate<T[P]>
        : DeepUpdate<T[P]>
}

export const updateMap = <T>(current: T, updater: DeepUpdate<T>): T => {
    const keys = Object.keys({ ...current, ...updater })
    return fromEntries(
        keys.map((k) => {
            const key = k as keyof T
            const currentValue = current[key]
            const updaterValue = updater[key]
            if (!(k in updater)) {
                return [k, currentValue]
            }
            if (typeof updaterValue === "function") {
                const update = updaterValue as any as UpdateFunction<ValueOf<T>>
                return [k, update(currentValue)]
            } else {
                return isRecursible(currentValue) &&
                    isRecursible(updaterValue) &&
                    !Array.isArray(updaterValue)
                    ? Array.isArray(currentValue)
                        ? [
                              k,
                              currentValue.map((item) =>
                                  updateMap(item, updaterValue as any)
                              )
                          ]
                        : [k, updateMap(currentValue, updaterValue as any)]
                    : [k, updaterValue]
            }
        })
    ) as T
}
