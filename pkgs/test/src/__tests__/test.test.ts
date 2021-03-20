import { test as redoTest, Step, launch, browserHandlers } from ".."

describe("test", () => {
    const signUpSteps: Step[] = [
        { kind: "click", selector: "'Get Started'" },
        {
            kind: "set",
            selector: "[name='email']",
            value: "david@redo.qa"
        },
        { kind: "click", selector: "'Keep me posted!'" }
    ]
    // test("works with default options", async () => {
    //     await redoTest(signUpSteps)
    // }, 60000)
    // test("works on firefox", async () => {
    //     await redoTest(signUpSteps, { browser: "firefox" })
    // }, 60000)
    // test("works on safari", async () => {
    //     await redoTest(signUpSteps, { browser: "safari" })
    // }, 60000)
    test("chromium can be positioned and sized", async () => {
        await launch("chrome", {
            // size: { height: 500, width: 1000 },
            // position: { x: 200, y: 200 },
            size: {
                height: 500, //1017,
                width: 1000 //1620
            },
            position: {
                x: 200, // 0
                y: 200 // 23
            }
        })
    }, 60000)
})
