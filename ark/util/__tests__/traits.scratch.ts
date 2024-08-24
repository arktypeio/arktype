import { Trait, implement } from "@ark/util"

// Declare a trait just like a normal class
export class Rectangle extends Trait {
	length: number
	width: number

	constructor(length: number, width: number) {
		super()
		this.length = length
		this.width = width
	}

	area(): number {
		return this.length * this.width
	}

	perimeter(): number {
		return 2 * (this.length + this.width)
	}
}

// Pass an object to the generic parameter to declare abstract methods
export class Rhombus extends Trait<{
	abstractMethods: {
		calculateArea(): number
	}
	abstractProps: {
		largestAngle: number
	}
}> {
	side: number

	constructor(side: number) {
		super()
		this.side = side
	}

	perimeter(): number {
		return this.side * 4
	}
}

// Use compose to implement a type-safe set of Traits
export class Square extends implement(
	Rectangle,
	Rhombus,
	// Here we have to implement any declared abstract methods.
	// Notice we don't need to reimplement area() since it can be derived from Rectangle!
	{
		calculateArea() {
			return this.side ** 2
		},
		construct: () => ({ largestAngle: 90 })
	}
) {
	readonly isRegular = true

	constructor(side: number) {
		// the composed constructor will be the minimal set of parameters
		// that satisfies all Traits- in this case (number, number).
		super(side, side)
	}
}

// Instantiate your class as you normally would
const square = new Square(5)
// derived from Rectangle
square.area() //?
// derived from Rhombus
square.perimeter() //?
// from Square
square.isRegular //?
// You can even use `instanceof` or get a list of implemented traits!
square instanceof Square //?
square instanceof Rectangle //?
square instanceof Rhombus //?
square.traitsOf() //?
