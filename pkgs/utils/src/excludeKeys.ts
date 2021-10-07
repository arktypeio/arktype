import { Key, NonRecursible, Unlisted } from "./common.js"
import { filter } from "./filter.js"

export type ExcludedByKeys<O, K extends Key[]> = Pick<
    O,
    Exclude<keyof O, K[number]>
>

export type ExcludedByKey<O, K> = Pick<O, Exclude<keyof O, K>>

export type DeepExcludedByKeys<O, K extends Key[]> = O extends NonRecursible
    ? O
    : {
          [P in keyof ExcludedByKeys<O, K>]: Array<any> extends O[P]
              ?
                    | Array<
                          DeepExcludedByKeys<
                              Unlisted<Exclude<O[P], NonRecursible>>,
                              K
                          >
                      >
                    | Extract<O[P], NonRecursible>
              :
                    | DeepExcludedByKeys<Exclude<O[P], NonRecursible>, K>
                    | Extract<O[P], NonRecursible>
      }

export const excludeKeys = <O, K extends Key[], D extends boolean = false>(
    o: O,
    keys: K,
    deep?: D
) =>
    filter(o, {
        objectFilter: ([k]) => !keys.includes(k as Key),
        deep: !!deep
    }) as any as D extends true
        ? DeepExcludedByKeys<O, K>
        : ExcludedByKeys<O, K>
