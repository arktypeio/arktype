// @ts-nocheck

type User = {
    name: string
    age: number
}

const s = scope({
    // these are standard type deftinions. you can infer them and use them to check data.
    admin: ["user", "&", { isAdmin: "true" }],
    json: "string",
    // this is a possible syntax for defining a "model"
    // A model defines a type and its morphs to and from other types in the scope (like a category)
    user: {
        in: {
            // possible syntactic sugar for an in mapping from undefined.
            // default: {
            //     name: "foo",
            //     age: 100
            // },
            undefined: () => ({ name: "foo", age: 100 }),
            json: (raw) => JSON.parse(raw),
            form: ({ first, last, birthday }) => ({
                name: first + " " + last,
                age: Date.now() - Date.parse(birthday)
            })
        },
        out: {
            json: (data: User) => JSON.stringify(data),
            // if an out mapping is defined from user=>admin, user can no longer
            // be specified as an in mapping of admin and will be available by default.
            // Could define additional params
            admin: (data: User) => ({ ...data, adminKind: "admin" })
        }
    }
})

const creditCard = type([
    /5431876432/,
    "=>",
    (s) => isLuhnValid(s),
    ":",
    {
        in: {
            number: (n) => String(n)
        },
        out: {
            number: (s) => parseInt(s)
        }
    }
])

type CreditCard = typeof creditCard.infer

const { data } = creditCard("54354235") // data is string
const { data } = creditCard(531243212) // data is string

// If there were inputs that couldn't be discriminated, would need to be explicit
const { data } = creditCard(531243212, { from: "number" }) // data is string

const { data } = creditCard(531243212).to("number") // data is number

// Could be used as a syntax to skip validation (would be used for conversions
// if the data has already been checked)
const { data } = creditCard("45325", "!").to("number")
const { data } = creditCard("45325", { check: false }).to("number")

// Could have variant types with a base type and sets of conditions
