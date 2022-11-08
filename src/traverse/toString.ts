export type astToString<node, result extends string = ""> = node extends [
    infer head,
    ...infer tail
]
    ? astToString<tail, `${result}${astToString<head>}`>
    : node extends string
    ? `${result}${node}`
    : result
