import typia from "typia"

export interface Moltar {
	number: number
	negNumber: number
	maxNumber: number
	string: string
	longString: string
	boolean: boolean
	deeplyNested: {
		foo: string
		num: number
		bool: boolean
	}
}

export const Moltar = typia.createValidate<Moltar>()
