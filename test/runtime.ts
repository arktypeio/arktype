// @ts-nocheck
/* eslint-disable @typescript-eslint/no-unused-vars */
import { scope, type } from "arktype"

/**
 *   1. "string"
 *   2. "string|number"
 *   3. "string|number[]"
 *   4. "(string|number)[]"
 *   5. "(email|number)[]"
 *   6. "(email|1<=number)[]"
 *   7. "(email|1<=number<100)[]"
 *   8. {
 *      emailsOrIds: "(email|1<number<10)[]",
 *
 *   }
 */

const myType = type("(email|1<=number<100)[]")

type MyType = typeof myType.infer
//     ^?

const { data, problems } = myType([3.14, ""])

console.log(problems?.summary ?? data)
