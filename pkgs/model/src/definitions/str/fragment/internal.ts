export * from "../internal.js"

export type FragmentContext = {
    delimiter: string
}

// export type CheckHalves<
//     First extends string,
//     Second extends string,
//     Root extends string,
//     Space,
//     FirstResult extends string = Fragment.Check<First, Root, Space>,
//     SecondResult extends string = Fragment.Check<Second, Root, Space>
// > = FirstResult extends ValidationErrorMessage
//     ? FirstResult
//     : SecondResult extends ValidationErrorMessage
//     ? SecondResult
//     : [First, Second, Root]
