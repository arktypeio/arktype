import { Trait, compose } from "@arktype/util"

// Declare a trait just like a normal class
export class Rectangle extends Trait {
	constructor(
		public length: number,
		public width: number
	) {
		super()
	}

	area() {
		return this.length * this.width
	}

	perimeter() {
		return 2 * (this.length + this.width)
	}
}

// Pass an object to the generic parameter to declare abstract methods
export class Rhombus extends Trait<{ largestAngle: number; area(): number }> {
	constructor(public side: number) {
		super()
	}

	perimeter() {
		return this.side * 4
	}
}

// Use compose to implement a type-safe set of Traits
class Square extends compose(Rectangle, Rhombus)(
	// Here we have to implement any declared abstract methods.
	// Notice we don't need to reimplement area() since it can be derived from Rectangle!
	{
		largestAngle: 90
	},
	// Methods with the same name must be disambiguated by specifying which
	// Trait to use. If there are no overlaps, this parameter is optional.
	{
		perimeter: Rhombus
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
