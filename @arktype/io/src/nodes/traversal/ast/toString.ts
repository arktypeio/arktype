// TODO: Update to include objects
export type toString<node, result extends string = ""> = node extends [
    infer head,
    ...infer tail
]
    ? toString<tail, `${result}${toString<head>}`>
    : node extends string
    ? `${result}${node}`
    : result
