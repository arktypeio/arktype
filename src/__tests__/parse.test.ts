// import { attest } from "@arktype/test"
// import { describe, test } from "mocha"
// import { space } from "../../index.js"
// import { shallowCycleMessage } from "../../space/parse.js"

// describe("parse space", () => {
//     TODO: Reenable
//     test("errors on shallow cycle", () => {
//         // TODO: Reenable
//         try {
//             // @ts-expect-error
//             attest(() => space({ a: "a" })).throwsAndHasTypeError(
//                 shallowCycleMessage(["a", "a"])
//             )
//             attest(() =>
//                 // @ts-expect-error
//                 space({ a: "b", b: "c", c: "a|b|c" })
//             ).throwsAndHasTypeError(shallowCycleMessage(["a", "b", "c", "a"]))
//         } catch {}
//     })
// })
