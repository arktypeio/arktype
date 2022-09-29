export const objectToString = () => {
    const isArray = Array.isArray(this.toIsomorphicDef)
    const nestedIndentation = indentation + "    "
    const indentation = "    ".repeat(this.ctx.path.length)
    let result = isArray ? "[" : "{"
    for (let i = 0; i < this.entries.length; i++) {
        result += "\n" + nestedIndentation
        if (!isArray) {
            result += this.entries[i][0] + ": "
        }
        result += this.entries[i][1].toString()
        if (i !== this.entries.length - 1) {
            result += ","
        } else {
            result += "\n"
        }
    }
    return result + indentation + (isArray ? "]" : "}")
}

export const checkObjectRoot = <ExpectedStructure extends ObjectKind>(
    definition: string,
    expectedStructure: ExpectedStructure,
    state: Check.CheckState
): state is Check.CheckState<
    ExpectedStructure extends "array" ? unknown[] : Dictionary
> => {
    const actual = jsTypeOf(state.data)
    if (expectedStructure !== actual) {
        const expectedStructureDescription =
            expectedStructure === "array" ? "an array" : "a non-array object"
        state.errors.add(
            "structure",
            {
                reason: `Must be ${expectedStructureDescription}`,
                state
            },
            {
                definition,
                data: state.data,
                expected: expectedStructure,
                actual
            }
        )
        return false
    }
    return true
}

export type ObjectKind = "object" | "array"

export type StructureDiagnostic = Check.DiagnosticConfig<{
    definition: string
    data: unknown
    expected: ObjectKind
    actual: NormalizedJsTypeName
}>

export type References<Ast> = CollectReferences<
    Ast extends readonly unknown[] ? Ast : UnionToTuple<Ast[keyof Ast]>,
    []
>

type CollectReferences<
    Children extends readonly unknown[],
    Result extends readonly unknown[]
> = Children extends [infer Head, ...infer Tail]
    ? CollectReferences<Tail, [...Result, ...RootNode.References<Head>]>
    : Result
