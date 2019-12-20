import { isRecursible, fromEntries, Unlisted } from "./common"

export type ShapeFilter<O, S> = {
    [P in S extends object
        ? Extract<keyof O, keyof S>
        : keyof O]: O[P] extends object
        ? O[P] extends Array<any>
            ? Unlisted<O[P]> extends object
                ? Array<ShapeFilter<Unlisted<O[P]>, S>>
                : O[P]
            : ShapeFilter<O[P], P extends keyof S ? S[P] : undefined>
        : O[P]
}

export const shapeFilter = <O, S>(o: O, shape: S): ShapeFilter<O, S> => {
    if (!isRecursible(o) || !isRecursible(shape)) {
        throw Error(
            `Can't shapeFilter non-objects. Parameters '${o}' and '${JSON.stringify(
                shape
            )}' were of types ${typeof o} and ${typeof shape}.`
        )
    }
    const recurse = (o: O, shape: S): ShapeFilter<O, S> =>
        (isRecursible(shape)
            ? Array.isArray(o)
                ? o.map(value => recurse(value, shape))
                : fromEntries(
                      Object.entries(o)
                          .filter(([key]) => key in shape)
                          .map(([key, value]) =>
                              isRecursible(value)
                                  ? [key, recurse(value, (shape as any)[key])]
                                  : [key, value]
                          )
                  )
            : o) as ShapeFilter<O, S>
    return recurse(o, shape)
}
