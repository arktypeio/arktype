import { type } from "arktype"
import dayjs from "dayjs"

dayjs.isDayjs

// Dayjs is undefined here in my env
const { Dayjs } = dayjs

console.log(Dayjs)

const out = type({
	dayjs: type.instanceOf(Dayjs)
})({
	dayjs: dayjs()
})
