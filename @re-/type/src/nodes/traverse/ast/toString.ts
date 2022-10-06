// TODO: Update to include objects
export type toString<Node, Result extends string = ""> = Node extends [
    infer Head,
    ...infer Tail
]
    ? toString<Tail, `${Result}${toString<Head>}`>
    : Node extends string
    ? `${Result}${Node}`
    : Result
