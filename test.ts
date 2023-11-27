import { type } from "arktype"
// import { keywords } from "./ark/schema/main.js"

// keywords.number.allows(5) //?
// keywords.number.allows("") //?

const validInput = {
	number: 1,
	negNumber: -1,
	maxNumber: Number.MAX_VALUE,
	string: "string",
	longString:
		"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivendum intellegat et qui, ei denique consequuntur vix. Semper aeterno percipit ut his, sea ex utinam referrentur repudiandae. No epicuri hendrerit consetetur sit, sit dicta adipiscing ex, in facete detracto deterruisset duo. Quot populo ad qui. Sit fugit nostrum et. Ad per diam dicant interesset, lorem iusto sensibus ut sed. No dicam aperiam vis. Pri posse graeco definitiones cu, id eam populo quaestio adipiscing, usu quod malorum te. Ex nam agam veri, dicunt efficiantur ad qui, ad legere adversarium sit. Commune platonem mel id, brute adipiscing duo an. Vivendum intellegat et qui, ei denique consequuntur vix. Offendit eleifend moderatius ex vix, quem odio mazim et qui, purto expetendis cotidieque quo cu, veri persius vituperata ei nec. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
	boolean: true,
	deeplyNested: {
		foo: "bar",
		num: 1,
		bool: false
	}
}

const invalidInput = {
	number: 1,
	negNumber: -1,
	maxNumber: Number.MAX_VALUE,
	string: "string",
	longString:
		"Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Vivendum intellegat et qui, ei denique consequuntur vix. Semper aeterno percipit ut his, sea ex utinam referrentur repudiandae. No epicuri hendrerit consetetur sit, sit dicta adipiscing ex, in facete detracto deterruisset duo. Quot populo ad qui. Sit fugit nostrum et. Ad per diam dicant interesset, lorem iusto sensibus ut sed. No dicam aperiam vis. Pri posse graeco definitiones cu, id eam populo quaestio adipiscing, usu quod malorum te. Ex nam agam veri, dicunt efficiantur ad qui, ad legere adversarium sit. Commune platonem mel id, brute adipiscing duo an. Vivendum intellegat et qui, ei denique consequuntur vix. Offendit eleifend moderatius ex vix, quem odio mazim et qui, purto expetendis cotidieque quo cu, veri persius vituperata ei nec. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.",
	boolean: true,
	deeplyNested: {
		foo: "bar",
		num: 1,
		bool: 5
	}
}

const dataArray = [...new Array(1000)].map((_, i) => ({
	...validInput,
	number: i
}))

const arkType = type({
	number: "number",
	negNumber: "number",
	maxNumber: "number",
	string: "string",
	longString: "string",
	boolean: "boolean",
	deeplyNested: {
		foo: "string",
		num: "number",
		bool: "boolean"
	}
})

const checkSingle = ($arkRoot: any) => {
	if (
		!(
			(typeof $arkRoot === "object" && $arkRoot !== null) ||
			typeof $arkRoot === "function"
		)
	) {
		return false
	}
	if ($arkRoot.boolean !== false && $arkRoot.boolean !== true) {
		return false
	}
	if (
		!(
			(typeof $arkRoot.deeplyNested === "object" &&
				$arkRoot.deeplyNested !== null) ||
			typeof $arkRoot.deeplyNested === "function"
		)
	) {
		return false
	}
	if (
		$arkRoot.deeplyNested.bool !== false &&
		$arkRoot.deeplyNested.bool !== true
	) {
		return false
	}
	if (!(typeof $arkRoot.deeplyNested.foo === "string")) {
		return false
	}
	if (!(typeof $arkRoot.deeplyNested.num === "number")) {
		return false
	}
	if (!(typeof $arkRoot.longString === "string")) {
		return false
	}
	if (!(typeof $arkRoot.maxNumber === "number")) {
		return false
	}
	if (!(typeof $arkRoot.negNumber === "number")) {
		return false
	}
	if (!(typeof $arkRoot.number === "number")) {
		return false
	}
	if (!(typeof $arkRoot.string === "string")) {
		return false
	}
	return true
}

const scope = new Function(
	`return {
        isString($arkRoot) {
            if (!(typeof $arkRoot === "string")) {
                return false
            }
            return true
        },
        isNumber($arkRoot) {
            if (!(typeof $arkRoot === "number")) {
                return false
            }
            return true
        },
        isBoolean($arkRoot) {
            if (
                $arkRoot !== false &&
                $arkRoot !== true
            ) {
                return false
            }
            return true
        },
        isObject($arkRoot) {
            if (
                !(
                    (typeof $arkRoot=== "object" &&
                        $arkRoot !== null) ||
                    typeof $arkRoot === "function"
                )
            ) {
                return false
            }
            return true
        },
        deep($arkRoot) {
            if(!this.isObject($arkRoot)) {
                return false
            }
            if (
                !(this.isBoolean($arkRoot.bool))
            ) {
                return false
            }
            if (!(this.isString($arkRoot.foo))) {
                return false
            }
            if (!(this.isNumber($arkRoot.num))) {
                return false
            }
            return true
        },
        foo($arkRoot) {
            if (
                !this.isObject($arkRoot)
            ) {
                return false
            }
            if ( !this.isBoolean($arkRoot.boolean)) {
                return false
            }
            if (!(this.isString($arkRoot.longString))) {
                return false
            }
            if (!this.isNumber($arkRoot.maxNumber)) {
                return false
            }
            if (!this.isNumber($arkRoot.negNumber)) {
                return false
            }
            if (!this.isNumber($arkRoot.number)) {
                return false
            }
            if (!(this.isString($arkRoot.string))) {
                return false
            }
            return this.deep($arkRoot.deeplyNested)
        }
    }`
)

const checkScoped = scope() //?

function check(this: any, data: unknown) {
	return this.foo(data)
}

const z = function (this: any, data: unknown) {
	return this.foo(data)
}.bind(checkScoped)

const result = z(invalidInput) //?

const allows = arkType.allows //?

allows.toString() //?

console.log(arkType.allows)

console.log(allows(validInput))

console.log(allows(invalidInput))

// bench("scoped", () => {
// 	for (let i = 0; i < 1000; i++) {
// 		checkScoped(dataArray[i])
// 	}
// }).median([6.79, "us"])

// bench("scoped2", () => {
// 	for (let i = 0; i < 1000; i++) {
// 		z(dataArray[i])
// 	}
// }).median([5.77, "us"])

// bench("allows", () => {
// 	for (let i = 0; i < 1000; i++) {
// 		allows(dataArray[i])
// 	}
// }).median([7.81, "us"])
