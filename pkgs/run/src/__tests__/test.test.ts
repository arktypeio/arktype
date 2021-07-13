import { test as redoTest, Step, launch, browserHandlers } from ".."

describe("test", () => {
    const readDocumentationSteps: Step[] = [
        { kind: "go", url: "https://redo.qa" },
        { kind: "click", element: { selector: "'Get Started'" } },
        {
            kind: "assertText",
            element: {
                selector: "pre:nth-child(3) > .hljs"
            },
            value: "npm install @re-do/test"
        }
    ]
    test("works with default options", async () => {
        await redoTest(readDocumentationSteps)
    }, 20000)
    test("works on firefox", async () => {
        await redoTest(readDocumentationSteps, { browser: "firefox" })
    }, 20000)
    test("works on safari", async () => {
        await redoTest(readDocumentationSteps, { browser: "safari" })
    }, 20000)
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
    }, 20000)
})
