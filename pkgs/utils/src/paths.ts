import { NonRecursible, Unlisted } from "./common.js"
import { Object, String, List } from "ts-toolbelt"
import { AutoPath } from "./AutoPath.js"

export type ValueAtPath<
    O extends object,
    P extends string,
    Delimiter extends string = "/"
> = Object.Path<O, String.Split<P, Delimiter>>

export function valueAtPath<O extends object, P extends string>(
    obj: O,
    path: AutoPath<O, P, "/">
): ValueAtPath<O, P> {
    const segments = path.split("/")
    let value = obj
    for (let segment of segments) {
        if (typeof value === "object" && segment in value) {
            value = (value as any)[segment]
        } else {
            // This should never happen if the provided types are accurate
            return undefined as any
        }
    }
    return value as any
}

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

type Join<K, P, Delimiter extends string = "/"> = K extends string | number
    ? P extends string | number
        ? `${K}${"" extends P ? "" : Delimiter}${P}`
        : never
    : never

export type Segment = string | number

export type Leaves<T, O extends C = {}, D extends number = 10> = [D] extends [
    never
]
    ? never
    : T extends O["treatAsLeaf"]
    ? ""
    : T extends object
    ? {
          [K in keyof T]-?: Join<K, Leaves<T[K], O, Prev[D]>>
      }[keyof T]
    : ""

// export type Leaves<
//     T,
//     TreatAsLeaf = NonRecursible,
//     Delimiter extends string = "/",
//     Depth extends number = 10,
//     CurrentPath extends string = ""
// > = [Depth] extends [never]
//     ? never
//     : T extends TreatAsLeaf | NonRecursible
//     ? CurrentPath
//     : {
//           [K in keyof T]-?: Leaves<
//               Unlisted<T[K]>,
//               TreatAsLeaf,
//               Delimiter,
//               Prev[Depth],
//               CurrentPath extends "" ? K : Join<CurrentPath, K, Delimiter>
//           >
//       }[keyof T]

type PathsFromLeaves<
    Leaves extends any,
    Delimiter extends string = "/"
> = Leaves extends string
    ? Leaves extends ""
        ? never
        :
              | Leaves
              | PathsFromLeaves<
                    String.Join<
                        List.Pop<String.Split<Leaves, Delimiter>>,
                        Delimiter
                    >,
                    Delimiter
                >
    : never

export type Constraints<Filter, Exclude, TreatAsLeaf> = {
    filter?: Filter
    exclude?: Exclude
    treatAsLeaf?: TreatAsLeaf
}

export type C = {
    filter?: any
    exclude?: any
    treatAsLeaf?: any
    skipArrays?: boolean
}

// export type Paths<
//     T,
//     LeafConstraints extends C = {},
//     Delimiter extends string = "/",
//     Depth extends number = 10,
//     Start extends string = ""
// > = PathsFromLeaves<
//     Leaves<T, LeafConstraints, Delimiter, Depth, Start>,
//     Delimiter
// >

export const getLeaves = <T>(value: T): Leaves<T, any[]> => "" as any

// const x =

// type XType = typeof x

const f = getLeaves({
    a: { b: "foop", c: true, d: [{ c: true }, { c: true }, { c: true }] }
})

// type F = Leaves<XType>
