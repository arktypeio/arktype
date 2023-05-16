class Base {
    constructor() {
        console.log(this.constructor.prototype.kind)
    }
}

class Sub extends Base {
    static kind = "foo"
}

new Sub()

console.log("hi")
