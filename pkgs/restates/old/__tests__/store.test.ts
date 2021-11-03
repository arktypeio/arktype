// import { DeepPartial } from "@re-do/utils"
// import { Store, ListenerMap, StoreOptions } from ".."

// type Root = {
//     a: A
//     b: boolean
//     c: string
//     d: A[]
//     e: string
// }

// type A = {
//     a: number
//     b: B
// }

// type B = {
//     a: number[]
//     b: C[]
// }

// type C = {
//     a: number
// }

// const initialB: B = Object.freeze({
//     a: [0],
//     b: [{ a: 0 }]
// })

// const initialA: A = Object.freeze({
//     a: 0,
//     b: initialB
// })

// const initialRoot: Root = Object.freeze({
//     a: initialA,
//     b: false,
//     c: "",
//     d: [initialA, initialA],
//     e: ""
// })

// const fakeResponse = "Success!"

// const fakeUpload = () =>
//     new Promise<string>((resolve) =>
//         setTimeout(() => resolve(fakeResponse), 100)
//     )

// const getStore = (options: StoreOptions<Root, any, any> = {}) =>
//     new Store(
//         initialRoot,
//         {
//             enableB: { b: true },
//             nameC: (name: string) => ({
//                 c: name
//             }),
//             addOneToEndOfList: {
//                 a: { b: { a: (_) => [..._, 1] } }
//             },
//             addNumberToEndOfList: (value: number) => ({
//                 a: { b: { a: (_) => [..._, value] } }
//             }),
//             appendObjectToArray: { d: (value) => value.concat(initialA) },
//             emptyDArray: { d: [] },
//             updateSomeValues: {
//                 b: (_) => _,
//                 c: (_) => `updated${_}`
//             },
//             uploadToServer: async () => {
//                 const result = await fakeUpload()
//                 return { c: result }
//             },
//             nameEFromC: (suffix: string, store) => ({
//                 e: store.get("c") + suffix
//             }),
//             nameEFromServerResponse: async (suffix: string, store) => {
//                 await store.$.uploadToServer()
//                 return { e: store.get("c") + suffix }
//             }
//         },
//         options
//     )

// let store = getStore()

// describe("queries", () => {
//     beforeAll(() => {
//         store = getStore()
//     })
//     test("handle shallow", () => {
//         expect(store.query({ b: true })).toStrictEqual({ b: false })
//     })
//     test("handle deep", () => {
//         expect(store.query({ a: true })).toStrictEqual({ a: initialA })
//     })
//     test("handle object arrays", () => {
//         expect(store.query({ d: true })).toStrictEqual({
//             d: [initialA, initialA]
//         })
//     })
//     test("handle filtered object within array", () => {
//         expect(store.query({ d: { a: true } })).toStrictEqual({
//             d: [{ a: 0 }, { a: 0 }]
//         })
//     })
//     test("don't include extraneous keys", () => {
//         expect(store.query({ a: { a: true } })).toStrictEqual({
//             a: { a: initialA.a }
//         })
//     })
// })

// describe("gets", () => {
//     beforeAll(() => {
//         store = getStore()
//     })
//     test("shallow", () => {
//         expect(store.get("c")).toBe("")
//     })
//     test("nested", () => {
//         expect(store.get("a/b/a")).toStrictEqual([0])
//     })
//     test("from array", () => {
//         expect(store.get("d/0/a")).toBe(0)
//     })
// })

// describe("actions", () => {
//     beforeEach(() => {
//         store = getStore()
//     })
//     test("direct update", () => {
//         store.update({ b: true })
//         expect(store.getState()).toStrictEqual({
//             ...initialRoot,
//             b: true
//         })
//     })
//     test("shallow set value", () => {
//         store.actions.enableB()
//         expect(store.getState()).toStrictEqual({
//             ...initialRoot,
//             b: true
//         })
//     })
//     test("shallow set function", () => {
//         store.$.nameC("redo")
//         expect(store.getState()).toStrictEqual({
//             ...initialRoot,
//             c: "redo"
//         })
//     })
//     test("deep set value", () => {
//         store.$.addOneToEndOfList()
//         expect(store.getState()).toStrictEqual({
//             ...initialRoot,
//             a: {
//                 ...initialRoot.a,
//                 b: {
//                     ...initialRoot.a.b,
//                     a: initialRoot.a.b.a.concat([1])
//                 }
//             }
//         })
//     })
//     test("deep set function", () => {
//         store.$.addNumberToEndOfList(5)
//         expect(store.getState()).toStrictEqual({
//             ...initialRoot,
//             a: {
//                 ...initialRoot.a,
//                 b: {
//                     ...initialRoot.a.b,
//                     a: initialRoot.a.b.a.concat([5])
//                 }
//             }
//         })
//     })
//     test("handles object arrays", () => {
//         store.$.appendObjectToArray()
//         expect(store.getState()).toStrictEqual({
//             ...initialRoot,
//             d: [initialA, initialA, initialA]
//         })
//     })
//     test("sets array value", () => {
//         store.$.emptyDArray()
//         expect(store.getState()).toStrictEqual({
//             ...initialRoot,
//             d: []
//         })
//     })
//     test("handles async", async () => {
//         await store.$.uploadToServer()
//         expect(store.getState()).toStrictEqual({
//             ...initialRoot,
//             c: fakeResponse
//         })
//     })
//     test("passes store as context", () => {
//         store.$.nameC("re")
//         store.$.nameEFromC("do")
//         expect(store.getState()).toStrictEqual({
//             ...initialRoot,
//             c: "re",
//             e: "redo"
//         })
//     }),
//         test("allows different action to be called from context", async () => {
//             await store.$.nameEFromServerResponse("!!")
//             expect(store.getState()).toStrictEqual({
//                 ...initialRoot,
//                 c: fakeResponse,
//                 e: `${fakeResponse}!!`
//             })
//         })
// })

// const cHandler = jest.fn()
// const bing = jest.fn()
// const dHandler = jest.fn()
// const onChange: ListenerMap<Root, Root> = {
//     c: cHandler,
//     b: bing,
//     d: dHandler
// }

// const functionalListener = jest.fn()

// const expectedContext = (
//     type: string,
//     payload: DeepPartial<Root>,
//     meta?: any
// ) => ({
//     store,
//     action: {
//         type,
//         payload,
//         meta: {
//             bypassOnChange: undefined,
//             statelessly: true,
//             ...meta
//         }
//     }
// })

// const getEnableBContext = () => expectedContext("enableB", { b: true })

// describe("side effects", () => {
//     beforeEach(() => {
//         store = getStore({ onChange })
//     })
//     test("handle side effects", () => {
//         store.$.enableB()
//         expect(bing).toBeCalledWith(true, getEnableBContext())
//     })
//     test("handles array side effects", () => {
//         store.$.appendObjectToArray()
//         expect(dHandler).toBeCalledWith(
//             [initialA, initialA, initialA],
//             expectedContext("appendObjectToArray", {
//                 d: [initialA, initialA, initialA]
//             })
//         )
//     })
//     test("doesn't trigger extraneous side effects", () => {
//         store.$.updateSomeValues()
//         expect(cHandler).toHaveBeenCalled()
//         expect(bing).not.toHaveBeenCalled()
//     })
//     test("handles side effects with function", () => {
//         store = getStore({ onChange: functionalListener })
//         store.$.enableB()
//         expect(functionalListener).toHaveBeenCalledWith(
//             { b: true },
//             getEnableBContext()
//         )
//     })
//     test("accepts an array of listeners", async () => {
//         store = getStore({ onChange: [functionalListener, onChange] })
//         store.$.enableB()
//         // I'm sure there's a more elegant way to wait for a listener to be called in jest but I don't want to figure it out ;)
//         await new Promise((_) => setTimeout(_, 100))
//         expect(bing).toBeCalledWith(true, getEnableBContext())
//         expect(functionalListener).toHaveBeenCalledWith(
//             { b: true },
//             getEnableBContext()
//         )
//     })
//     test("listeners can be optionally bypassed", () => {
//         store.update({ b: true }, { bypassOnChange: true })
//         expect(bing).not.toBeCalled()
//     })
// })

// describe("validation", () => {
//     beforeEach(() => {
//         store = getStore({
//             validate: (o: Root) => {
//                 if (o.c === "good") {
//                     return true
//                 } else if (o.c === "fixable") {
//                     return { ...o, c: "good" }
//                 } else if (o.c === "broken") {
//                     return o
//                 } else {
//                     throw new Error("invalid")
//                 }
//             }
//         })
//     })
//     test("good state", () => {
//         store.update({ c: "good" })
//         expect(store.get("c")).toBe("good")
//     })
//     test("fixable state", () => {
//         store.update({ c: "fixable" })
//         expect(store.get("c")).toBe("good")
//     })
//     test("broken fixable", () => {
//         expect(() => store.update({ c: "broken" })).toThrow("broken")
//     })
//     test("non-fixable", () => {
//         expect(() => store.update({ c: "invalid" })).toThrow("invalid")
//     })
// })

// describe("add ids", () => {
//     beforeEach(() => {
//         store = getStore({
//             addIds: { paths: [["d"], ["a", "b", "b"]] }
//         })
//     })
//     test("shallow", () => {
//         store.update({ d: (_) => _.concat(initialA) })
//         expect(store.getState()).toStrictEqual({
//             ...initialRoot,
//             d: [
//                 { ...initialA, id: 1 },
//                 { ...initialA, id: 1 },
//                 { ...initialA, id: 1 }
//             ]
//         })
//     })
//     test("nested", () => {
//         store.update({
//             a: { b: { b: [{ a: 0 }, { a: 1 }] } }
//         })
//         expect(store.getState()).toStrictEqual({
//             ...initialRoot,
//             a: {
//                 ...initialA,
//                 b: {
//                     ...initialB,
//                     b: [
//                         { a: 0, id: 1 },
//                         { a: 1, id: 1 }
//                     ]
//                 }
//             }
//         })
//     })
//     test("errors on add ID to non-array", () => {
//         const badStore = getStore({ addIds: { paths: [["a", "b"]] } })
//         expect(() => badStore.update({ a: { b: { a: [1] } } })).toThrowError(
//             "a/b"
//         )
//     })
// })
