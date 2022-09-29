export const pathToString = (path: Path) =>
    path.length === 0 ? "/" : path.join("/")

export type Segment = string | number
export type Path = Segment[]

// TODO: Update to include objects
export type NodeToString<Node, Result extends string = ""> = Node extends [
    infer Head,
    ...infer Tail
]
    ? NodeToString<Tail, `${Result}${NodeToString<Head>}`>
    : Node extends string
    ? `${Result}${Node}`
    : Result
