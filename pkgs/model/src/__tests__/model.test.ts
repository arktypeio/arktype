import { join } from "path"
import { loadStore, RedoStore } from "../model"
import { removeSync } from "fs-extra"
jest.mock("uuid", () => ({ v4: () => "FAKE-UUID" }))

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
            { kind: "click", id: "FAKE-UUID" },
            {
                kind: "set",
                id: "FAKE-UUID",
                value: "New Value"
            }
        ],
        tags: []
    }
    test("translates selectors to elements", () => {
        store.createTest(testData as any)
        expect(store.getTests()).toStrictEqual([storedTestData])
    })
    test("translates stored tests to executable tests", () => {
        expect(store.testToSteps(storedTestData as any)).toStrictEqual(
            testData.steps
        )
    })
})
