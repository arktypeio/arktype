// TODO: Update to include objects
export type ToString<Ast, Result extends string = ""> = Ast extends [
    infer head,
    ...infer tail
]
    ? ToString<tail, `${Result}${ToString<head>}`>
    : Ast extends string
    ? `${Result}${Ast}`
    : Result
