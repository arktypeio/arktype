import { withArrays } from ".."

const o = Object.freeze({
    a: {
        0: "zero",
        1: "one"
    },
    b: {
        a: {
            0: false,
            1: true
        },
        b: ""
    },
    c: {
        a: true
    }
})

const expected = {
    a: ["zero", "one"],
    b: {
        a: [false, true],
        b: ""
    },
    c: {
        a: true
    }
}

test("converts array-like objects", () => {
    expect(withArrays(o)).toStrictEqual(expected)
})
