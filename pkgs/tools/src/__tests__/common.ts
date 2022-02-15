export const o = Object.freeze({
    a: {
        a: "",
        b: [0],
        c: {
            a: true,
            b: false,
            c: null
        } as { a: boolean; b: boolean; c: null; d?: boolean }
    },
    b: {
        a: {
            a: 1
        }
    },
    c: null,
    d: "initial",
    e: [{ a: ["old"] }, { a: ["old"] }]
})
