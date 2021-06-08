import { join } from "path"
import { store } from "../store"
import { testToSteps } from "../data"
import { removeSync } from "fs-extra"

describe("store", () => {
    beforeEach(() => {
        removeSync(join(__dirname, "redo.json"))
        store.$.reloadData()
    })
    test("can retrieve existing tests", () => {
        expect(store.get("data/tests")).toStrictEqual([])
    })
    test("can create new tests", () => {
        const newTest = { name: "New Test", steps: [], tags: [] }
        store.$.saveTest([newTest])
        expect(store.get("data/tests")).toStrictEqual([newTest])
        store.$.saveTest([newTest])
        expect(store.get("data/tests")).toStrictEqual([newTest, newTest])
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
        store.$.saveTest([testData])
        expect(store.get("data/tests")).toStrictEqual([storedTestData])
        expect(store.get("data/elements")).toStrictEqual(storedElementData)
    })
    test("translates stored tests to executable tests", () => {
        store.$.saveTest([testData])
        expect(testToSteps(storedTestData as any)).toStrictEqual(testData.steps)
    })
    test("reuses existing elements", () => {
        store.$.saveTest([testData])
        store.$.saveTest([testData])
        expect(store.get("tests")).toStrictEqual([
            storedTestData,
            storedTestData
        ])
        expect(store.get("elements")).toStrictEqual(storedElementData)
    })
})
