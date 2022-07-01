import { assert } from "../src/assert.js"

const emptySnaps = () => {
    // type
    assert({ re: "do" })
        .equals({ re: "do" })
        .type.toString.snap(`{ re: string; }`)

    //5
    assert(5).snap(5)

    //multiline
    assert("firstLine\nsecondLine").snap(`firstLine
secondLine`)

    // object
    assert({ re: `do` }).snap({ re: `do` })
}
emptySnaps()
