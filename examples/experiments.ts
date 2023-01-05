// @ts-nocheck

const date = type("date", {
    from: {
        string: (s) => {
            return new Date(s)
        }
    }
})

// There is some "string input", and a definition for how it is transformed
// What is the type of Data
// Maybe there are some morphs for outgoing types
const { data, problems } = date("string", "5/12/2023")

// Arbitrary input/output types on morphs vs key names representing defined types
