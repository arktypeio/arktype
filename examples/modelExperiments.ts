// @ts-nocheck

type User = {
    name: string
    age: number
}

// TODO: Subscope syntax, e.g. user.admin? Or could just allow existing record types to be accessed this way?
// Could have variant types with a base type and sets of conditions
const s = scope({
    user: {
        name: "string",
        age: "number"
    },
    admin: ["user", "&", { isAdmin: "true" }],
    json: "string"
})

// A model defines relationships between the types in a scope (like a category)
// User would be a defined type in the scope, so the model could be dedicated to the morphs
const model = s.model({
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

// Could be a union of in types? Would need to be able to discriminate between them, otherwise would have to be named.
model.user.from('{name: "david", age: "105"  }')
model.user.from.json('{name: "david", age: "105"  }') //returns user
model.user.to.json({ name: "david", age: 105 }) //returns json

// TODO: Sugar for I/O type
