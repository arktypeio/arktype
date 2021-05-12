import { join } from "path"
import { loadStore, RedoStore } from "../persist"
import { removeSync } from "fs-extra"

describe("store", () => {
    let store: RedoStore
    beforeEach(() => {
        const path = join(__dirname, "redo.json")
        removeSync(path)
        store = loadStore({ path })
    })
    test("can retrieve existing tests", () => {
        expect(store.getTests()).toStrictEqual([])
    })
    test("can create new tests", () => {
        const newTest = { name: "New Test", steps: [], tags: [] }
        store.createTest(newTest)
        expect(store.getTests()).toStrictEqual([newTest])
        store.createTest(newTest)
        expect(store.getTests()).toStrictEqual([newTest, newTest])
    })
    const testData = {
        name: "Test With Steps",
        steps: [
            { kind: "click", selector: "#button" },
            {
                kind: "set",
                selector: "#textbox",
                value: "New Value"
            }
        ],
        tags: []
    }
    const storedTestData = {
        name: "Test With Steps",
        steps: [
            { kind: "click", element: 1 },
            {
                kind: "set",
                element: 2,
                value: "New Value"
            }
        ],
        tags: []
    }
    const storedElementData = [
        {
            id: 1,
            selector: "#button"
        },
        {
            id: 2,
            selector: "#textbox"
        }
    ]
    test("translates selectors to elements", () => {
        store.createTest(testData as any)
        expect(store.getTests()).toStrictEqual([storedTestData])
        expect(store.getElements()).toStrictEqual(storedElementData)
    })
    test("translates stored tests to executable tests", () => {
        store.createTest(testData as any)
        expect(store.testToSteps(storedTestData as any)).toStrictEqual(
            testData.steps
        )
    })
    test("reuses existing elements", () => {
        store.createTest(testData as any)
        store.createTest(testData as any)
        expect(store.getTests()).toStrictEqual([storedTestData, storedTestData])
        expect(store.getElements()).toStrictEqual(storedElementData)
    })
})
