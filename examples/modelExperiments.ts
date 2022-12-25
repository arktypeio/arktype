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

// Could be a union of in types? Would need to be able to discriminate between them, otherwise would have to be named.
scope.user.from('{name: "david", age: "105"  }')
scope.user.from.json('{name: "david", age: "105"  }') //returns user
scope.user.to.json({ name: "david", age: 105 }) //returns json

// Could have variant types with a base type and sets of conditions

// TODO: Sugar for I/O type

// TODO: models can be in scope without having to be a type, e.g.
// generics also wouldn't be legal to refer to as a normal type
