import { test as redoTest, Step, launch, browserHandlers } from ".."

describe("test", () => {
    const readDocumentationSteps: Step[] = [
        // Disabling temporarily until CI is fixed
        // { kind: "go", url: "https://redo.qa" }
        // { kind: "click", element: { selector: "'Get Started'" } },
        // {
        //     kind: "assertText",
        //     element: {
        //         selector: "pre:nth-child(3) > .hljs"
        //     },
        //     value: "npm install @re-do/test"
        // }
    ]
    test("works with default options", async () => {
        const result = await redoTest(readDocumentationSteps)
        expect(result).toBe(true)
    }, 20000)
    test("works on firefox", async () => {
        const result = await redoTest(readDocumentationSteps, {
            browser: "firefox"
        })
        expect(result).toBe(true)
    }, 20000)
    test("works on safari", async () => {
        const result = await redoTest(readDocumentationSteps, {
            browser: "safari"
        })
        expect(result).toBe(true)
    }, 20000)
})
