// class Callable {
// 	constructor(fn: Function) {
// 		return () => fn.call(this)
// 	}
// }

// class MeCallable extends Callable {
// 	constructor() {
// 		super(() => Sub.prototype.foo.call(this))
// 		Object.setPrototypeOf(this, Sub.prototype)
// 	}
// 	salutation = "Mr. "
// 	doSomething() {
// 		return this.salutation + "doSomething"
// 	}
// }

// class Sub extends MeCallable {
// 	// constructor() {
// 	// 	super(() => {
// 	// 		return this.foo
// 	// 	})
// 	// }

// 	foo() {
// 		return this.doSomething()
// 	}
// }

// const abc = new Sub()

// abc.doSomething() //?
// abc() //?

// class Callable2 {
// 	constructor(defaultFn: Function) {
// 		return (...args: any[]) => {
// 			return defaultFn.call(this, ...args)
// 		}
// 	}
// }

// class MeCallable2 extends Callable2 {
// 	constructor() {
// 		super((name: string) => "Hello: " + this.salutation + name)
// 		Object.setPrototypeOf(this, MeCallable.prototype)
// 	}
// 	salutation = "Mr. "
// 	doSomething() {
// 		console.log(this.salutation, "doSomething")
// 	}
// }

// const abc2 = new MeCallable2()

// abc2("ff") //?
