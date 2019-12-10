export type Root = {
    a: A
    b: boolean
    c: string
    d: A[]
}

export type A = {
    a: number
    b: B
}

export type B = {
    a: number[]
}

export const initialA: A = Object.freeze({
    a: 0,
    b: {
        a: [0]
    }
})

export const initialRoot: Root = Object.freeze({
    a: initialA,
    b: false,
    c: "",
    d: [initialA, initialA]
})
