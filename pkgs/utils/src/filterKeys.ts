import { Key, NonRecursible, Unlisted } from "./common"
import { filter } from "./filter"

export type FilteredByKeys<O, K extends Key[]> = Pick<
    O,
    Extract<keyof O, K[number]>
>

type DeepFilteredByKeys<O, K extends Key[]> = O extends NonRecursible
    ? O
    : {
          [P in keyof FilteredByKeys<O, K>]: Array<any> extends O[P]
              ?
                    | Array<
                          DeepFilteredByKeys<
                              Unlisted<Exclude<O[P], NonRecursible>>,
                              K
                          >
                      >
                    | Extract<O[P], NonRecursible>
              :
                    | DeepFilteredByKeys<Exclude<O[P], NonRecursible>, K>
                    | Extract<O[P], NonRecursible>
      }

export const filterKeys = <O, K extends Key[], D extends boolean = false>(
    o: O,
    keys: K,
    deep?: D
) =>
    filter(o, {
        objectFilter: ([k]) => keys.includes(k as Key),
        deep
    }) as any as D extends true
        ? DeepFilteredByKeys<O, K>
        : FilteredByKeys<O, K>
