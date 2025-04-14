import { type } from "arktype"

const Even = type.number.divisibleBy(2)
const By3 = type.number.divisibleBy(3)
const By6 = Even.and(By3)

console.log(By6.description)
By6.extends(By3) //?
By3.extends(By6) //?
