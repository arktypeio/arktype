export const sizeOf = <data>(data: data) =>
    sizedObjectKinds[objectKindOf(data)]?.(data) ?? 0

const sizedObjectKinds = {
    Number: (data) => data,
    String: (data) => data.length,
    Array: (data) => data.length
} satisfies {
    [objectKind in SizedObjectKind]: (data: inferKind<objectKind>) => number
} as {
    [objectKind in DefaultObjectKind]?: (data: unknown) => number
}

export const unitsOf = <data>(data: data) => sizeUnits[objectKindOf(data)] ?? ""

const sizeUnits = {
    Number: "",
    String: "characters",
    Array: "items"
} satisfies Record<SizedObjectKind, string> as {
    [objectKind in DefaultObjectKind]?: string
}

export type SizedObjectKind = "Number" | "String" | "Array"

export type SizedData = inferKind<SizedObjectKind>

export const classNameOf = <data>(data: data) => Object(data).constructor.name
