import { assert } from "../src/assert.js"

const emptySnaps = () => {
    // type
    assert({ re: "do" }).equals({ re: "do" }).type.toString.snap()

    //5
    assert(5).snap()

    //multiline
    assert("firstLine\nsecondLine").snap()

    // object
    assert({ re: `do` }).snap()
}
emptySnaps()
