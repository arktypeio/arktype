export const valueAtPath = <T extends object>(obj: T, path: Path<T>) => {
    const segments = (path as string).split("/")
    let value = obj
    for (let segment of segments) {
        console.log({ value, segment })
        if (typeof value === "object" && segment in value) {
            value = (value as any)[segment]
        } else {
            return undefined
        }
    }
    return value
}

// Represents a valid path through nested keys of T as a "/" separated string
// See https://stackoverflow.com/questions/58434389/typescript-deep-keyof-of-a-nested-object
export type Path<T, D extends number = 5> = [D] extends [never]
    ? never
    : T extends object
    ? {
          [K in keyof T]-?: K extends string | number
              ? `${K}` | Join<K, Path<T[K], Prev[D]>>
              : never
      }[keyof T]
    : ""

type x = [] extends Array<any> ? true : false

type Join<K, P> = K extends string | number
    ? P extends string | number
        ? `${K}${"" extends P ? "" : "/"}${P}`
        : never
    : never

type Prev = [
    never,
    0,
    1,
    2,
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    12,
    13,
    14,
    15,
    16,
    17,
    18,
    19,
    20,
    ...0[]
]
