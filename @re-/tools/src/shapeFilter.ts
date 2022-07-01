import { fromEntries, isRecursible, List, NonRecursible } from "./common.js"
import { toString } from "./toString.js"

type Unlisted<T> = T extends List<infer Item> ? Item : T

export type ShapeFilter<O, S> = O extends NonRecursible
    ? O
    : {
          [K in S extends object
              ? Extract<keyof O, keyof S>
              : keyof O]: Array<any> extends O[K]
              ?
                    | Array<
                          ShapeFilter<
                              Unlisted<Exclude<O[K], NonRecursible>>,
                              K extends keyof S ? S[K] : undefined
                          >
                      >
                    | Extract<O[K], NonRecursible>
              :
                    | ShapeFilter<
                          Exclude<O[K], NonRecursible>,
                          K extends keyof S ? S[K] : undefined
                      >
                    | Extract<O[K], NonRecursible>
      }

export const shapeFilter = <O, S>(o: O, shape: S): ShapeFilter<O, S> => {
    if (!isRecursible(o) || !isRecursible(shape)) {
        throw new Error(
            `Can't shapeFilter non-objects. Parameters '${toString(
                o
            )}' and '${toString(
                shape
            )}' were of types ${typeof o} and ${typeof shape}.`
        )
    }
    const recurse = (o: {}, shape: unknown): any =>
        isRecursible(shape)
            ? Array.isArray(o)
                ? o.map((value) => recurse(value, shape))
                : fromEntries(
                      Object.entries(o)
                          .filter(([key]) => key in shape)
                          .map(([key, value]) =>
                              isRecursible(value)
                                  ? [key, recurse(value, (shape as any)[key])]
                                  : [key, value]
                          )
                  )
            : o
    return recurse(o, shape)
}
