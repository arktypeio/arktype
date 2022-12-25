// @ts-nocheck

type User = {
    name: string
    age: number
}

// Ideas for TypeSafes
//  Keep data in a class or proxy, could gaurantee mutations

type ModelBox<T> = {
    readonly data: T
    readonly set: (data: T) => xor<Data<T>, Problems>
    readonly update: (fn: (old: T) => T) => xor<Data<T>, Problems>
    readonly to: {
        [k in outMorphs]: () => ModelBox<outMorphs<T>>
    }
}

const userOne = model.user.box({}) as ModelBox<User>

const { data, problems } = user.set({ name: "foo", age: 15 })
const result = user.update((old) => ({ ...old, age: 20 }))

type ModelProxy<T> = {
    get: Readonly<T>
    // direct mutations managed through proxy, autovalidated updates
    set: T
}

const user2 = {} as ModelProxy<User>

const n = user.get.age

user2.set.age = 5

// is this possible?
type ValidatedModel<T> = T & {
    $: {
        eject: () => T
    }
}

const user = {} as ValidatedModel<User>

const n = user.age

//  runs setter
user.age = 5
