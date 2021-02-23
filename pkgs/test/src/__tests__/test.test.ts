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
    test("works with default options", async () => {
        await redoTest(signUpSteps)
    }, 60000)
    test("works on firefox", async () => {
        await redoTest(signUpSteps, { browser: "firefox" })
    }, 60000)
    test("works on safari", async () => {
        await redoTest(signUpSteps, { browser: "safari" })
    }, 60000)
})
