import { test as redoTest, Step, launch, browserHandlers } from ".."

describe("test", () => {
    const signUpSteps: Step[] = [
        { kind: "go", url: "https://redo.qa" },
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
    }, 10000)
    test("works on firefox", async () => {
        await redoTest(signUpSteps, { browser: "firefox" })
    }, 10000)
    test("works on safari", async () => {
        await redoTest(signUpSteps, { browser: "safari" })
    }, 10000)
    test("chromium can be positioned and sized", async () => {
        const { browser } = await launch("chrome", {
            size: {
                height: 100,
                width: 1000
            },
            position: {
                x: 100,
                y: 1000
            }
        })
        await browser.close()
    }, 10000)
})
