import { join } from "path"
import { FileStore } from ".."

type Root = {
    a: {
        enabled: boolean
    }[]
    b: string
}

const fallback: Root = {
    a: [],
    b: "not in model"
}

let store: FileStore<Root, {}>

describe("persist", () => {
    beforeEach(() => {
        store = new FileStore(
            fallback,
            {},
            { path: join(__dirname, "store.json"), bidirectional: false }
        )
        store.update(fallback)
    })
    test("works", () => {
        store.model.a.persist({ enabled: true })
        expect(store.get("a")).toStrictEqual([{ enabled: true }])
    })
    test("doesn't include non-object-arrays", () => {
        // @ts-ignore
        expect(() => store.model.b.persist("not in model")).toThrowError()
    })
})
