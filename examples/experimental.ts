const type = (def: any) => []

const user = type({
    password: () => {}
})

const scope = (def: any) => []

// identity tuple (.e.g ["is", mySymbol])
// instanceof tuple (e.g. ["instanceof", MyClass])

// union would work fine for this currently. Is there a case where this is better than discriminated union?
// ternary tuple (e.g. ["unknown[]", "?", "user[]" : "user"] )
//
const s = scope({
    //  constrain  (only checks data, doesn't modify).
    user: ["string", (data) => data === "Foo"] satisfies [unknown, constrain],
    // morph type
    group: [
        // Both sides are specified, but by default only input would be checked
        {
            age: "string"
        },
        (input) => ({
            age: parseInt(input.age)
        }),
        // To use automatic mappings, could add an "as" parameter here?
        // Some mappings would be available by default (e.g. number to string)
        // Default mappings could also be provided for alias pairs
        // These could be considered "traits" of a type. Traits could be extended using a key syntax
        { age: "number" }
    ] satisfies [unknown, morph, unknown]
})

type constrain = (data: string) => boolean

type morph = (input: { age: string }) => { age: number }
