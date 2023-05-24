const cache: Record<string, Base> = {}

class Base {
    constructor(key: string) {
        if (cache[key]) {
            throw new Error(`${key} was already in cache`)
        }
        cache[key] = this
    }
}

let count = 0

class A extends Base {
    count = count++
    constructor(key: string, public value: unknown) {
        // if (cache[key]) {
        //     return cache[key]
        // }
        super(key)
    }
}

const a = new A("foo", "bar")
const b = new A("foo", "baz")

// Output: "baz"
console.log(a.value)
console.log(b.value)

console.log(a.count)
console.log(b.count)
