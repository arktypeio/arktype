// Represents a valid path through nested keys of T as a "/" separated string
// See https://stackoverflow.com/questions/58434389/typescript-deep-keyof-of-a-nested-object

export type Path<T, D extends number = 10> = [D] extends [never]
    ? never
    : T extends object
    ? {
          [K in keyof T]-?: K extends string | number
              ? `${K}` | Join<K, Path<T[K], Prev[D]>>
              : never
      }[keyof T]
    : ""

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
