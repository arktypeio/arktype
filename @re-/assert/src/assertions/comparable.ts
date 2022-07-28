export type ComparableValueAssertion<T, AllowTypeAssertions extends boolean> = {
    is: (value: T) => NextAssertions<AllowTypeAssertions>
    snap: ((value?: T) => NextAssertions<AllowTypeAssertions>) & {
        toFile: (
            name: string,
            options?: ExternalSnapshotOptions
        ) => NextAssertions<AllowTypeAssertions>
    }
    equals: (
        value: T,
        options?: EqualsOptions
    ) => NextAssertions<AllowTypeAssertions>
    value: Omit<ComparableValueAssertion<unknown, AllowTypeAssertions>, "value">
} & (AllowTypeAssertions extends true
    ? { typedValue: (expected: unknown) => undefined }
    : {})
