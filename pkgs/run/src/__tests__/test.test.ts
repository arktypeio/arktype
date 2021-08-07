import { test as redoTest, Step, ensureBrowserInstalled } from ".."

const readDocumentationSteps: Step[] = [
    { kind: "go", url: "https://redo.qa" },
    { kind: "click", element: { selector: "'Get Started'" } },
    {
        kind: "assertText",
        element: {
            selector: "code:text('npm install @re-do/test')"
        },
        value: "npm install @re-do/test"
    }
]

describe("test", () => {
    beforeAll(async () => {
        await ensureBrowserInstalled("chrome")
        await ensureBrowserInstalled("firefox")
        await ensureBrowserInstalled("safari")
    }, 120000)
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
