import { declare, scope, type } from "arktype"

const point2d = type({
	x: "number",
	y: "number",
	"+": "delete"
})

const point3d = type({
	x: "number",
	y: "number",
	z: "number",
	"+": "delete"
})

const t = point2d.or(point3d)

// number
const n = type("1 | number").expression
