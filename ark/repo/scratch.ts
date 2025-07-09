const regex1 = /(a|c)b/dgim
const str1 = "zabcb"
let array1

const result = regex1.exec(str1)

console.log(result)

console.log(regex1.exec(str1))

// while ((array1 = regex1.exec(str1)) !== null) {
// 	console.log(array1)
// 	console.log(`Found ${array1[0]}. Next starts at ${regex1.lastIndex}.`)
// 	// Expected output: "Found foo. Next starts at 9."
// 	// Expected output: "Found foo. Next starts at 19."
// }

// correct for .test
type R = `${string}f${string}` | `${string}moo${string}`

// for .exec at index 0

type Optimal = `${string}f${string}` | "moo"

type Actual = `${string}f${string}` | `${string}moo${string}`

const regex2 = /^.*f.*$|m(x)?oo/

regex2.exec("aamoobb") //?
