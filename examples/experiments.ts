// @ts-nocheck

// A model defines relationships between the types in a scope (like a category)
// User would be a defined type in the scope, so the model could be dedicated to the morphs
const model = myScope.model({
    user: {
        // map of names
        in: {
            // non-model types for "in"
            json: (from: string) => JSON.parse(from) as User
        },
        out: {
            // types or models for "out"
            json: (data: User) => JSON.stringify(data),
            admin: (data: User) => ({ ...data, adminKind: "admin" })
        }
    }
})

// Could be a union of in types? Would need to be able to discriminate between them, otherwise would have to be named.
model.user.from('{name: "david", age: "105"  }')

model.user.from("json", '{name: "david", age: "105"  }')

// To syntax doesn't really make sense without a discriminant key
model.user.to("json", { name: "david", age: 105 })

model.user({ name: "david", age: 105 }).to("json")

model.user.morph({ name: "david", age: 105 }).to("json")
