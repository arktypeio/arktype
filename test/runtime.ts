// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */
import { scope, type } from "arktype"

/**  // data is "foo"
 *   1. "string"
 *   2. "string|number"
 *   // data to ["foo"]
 *   3. "string|number[]"
 *   4. "(string|number)[]"
 *   5. "(email|number)[]"
 *  // data to ["david@arktype.io"]
 *   6. "(email|1<=number)[]"
 *   7. "(email|1<number<=10)[]"
 *  // data to ["david@arktype.io", "shawn@arktype.io"]
 *   8. {
 *      myKey: "(email|1<number<10)[]",
 *   }
 *   // data to {myType: ["david@arktype.io", "shawn@arktype.io"]}
 *   9. {
 *      myKey: "(email|1<number<10)[]",
 *      nested: {}
 *   }
 *   8. {
 *      myKey: "(email|1<number<10)[]",
 *      nested: {
 *         "optional?": "parsedDate"
 *      }
 *   }
 */

const myType = type("string|number[]")

type MyType = typeof myType.infer

const { data, problems } = myType([3.14, ""])

console.log(problems?.summary ?? data)
