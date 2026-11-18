// typia's validators for scenarios.ts, compiled by `pnpm benchTypia`
import typia, { type tags } from "typia"

interface Moltar {
	number: number
	negNumber: number
	maxNumber: number
	string: string
	longString: string
	boolean: boolean
	deeplyNested: { foo: string; num: number; bool: boolean }
}

type Title = string & tags.MinLength<1> & tags.MaxLength<100>

interface Image {
	id: number
	created: Date
	title: Title
	type: "jpg" | "png"
	size: number
	url: string & tags.Format<"url">
}

interface Rating {
	id: number
	stars: number & tags.Minimum<1> & tags.Maximum<5>
	title: Title
	text: string & tags.MinLength<1> & tags.MaxLength<1000>
	images: Image[]
}

interface Product {
	id: number
	created: Date
	title: Title
	brand: string & tags.MinLength<1> & tags.MaxLength<30>
	description: string & tags.MinLength<1> & tags.MaxLength<500>
	price: number & tags.Minimum<1> & tags.Maximum<10000>
	discount: (number & tags.Minimum<1> & tags.Maximum<100>) | null
	quantity: number & tags.Minimum<0> & tags.Maximum<10>
	tags: (string & tags.MinLength<1> & tags.MaxLength<30>)[]
	images: Image[]
	ratings: Rating[]
}

type Items = { id: number; name: string; active: boolean }[]

type Patterns = (string & tags.Pattern<"^[ab]+$">)[]

type Discriminated =
	| { kind: "a"; a: string }
	| { kind: "b"; b: number }
	| { kind: "c"; c: boolean }
	| { kind: "d"; d: string[] }

interface Constraints {
	name: string & tags.MinLength<1> & tags.MaxLength<50>
	email: string & tags.Format<"email">
	age: number &
		tags.Type<"int64"> &
		tags.Minimum<0> &
		tags.ExclusiveMaximum<150>
	ratio: number & tags.ExclusiveMinimum<0> & tags.Maximum<1>
	code: string & tags.Pattern<"^[A-Z]{3}-\\d{4}$">
}

interface TreeNode {
	id: number
	children: TreeNode[]
}

export const Moltar = typia.createValidate<Moltar>()
export const MoltarIs = typia.createIs<Moltar>()
export const MoltarAssert = typia.createAssert<Moltar>()
export const MoltarStrict = typia.createValidateEquals<Moltar>()
export const MoltarStrictAssert = typia.createAssertEquals<Moltar>()
export const MoltarStrip = typia.plain.createValidatePrune<Moltar>()
export const Product = typia.createValidate<Product>()
export const ProductAssert = typia.createAssert<Product>()
export const ProductStrip = typia.plain.createValidatePrune<Product>()
export const Items = typia.createValidate<Items>()
export const ItemsAssert = typia.createAssert<Items>()
export const Patterns = typia.createValidate<Patterns>()
export const PatternsAssert = typia.createAssert<Patterns>()
export const Discriminated = typia.createValidate<Discriminated>()
export const Constraints = typia.createValidate<Constraints>()
export const Tree = typia.createValidate<TreeNode>()
export const Rotating = [
	typia.createValidate<string>(),
	typia.createValidate<string & tags.MinLength<1>>(),
	typia.createValidate<{ a: string }>(),
	typia.createValidate<number>(),
	typia.createValidate<{ b: number }>(),
	typia.createValidate<string[]>(),
	typia.createValidate<{ c: boolean } | { d: number }>(),
	typia.createValidate<
		number & tags.Minimum<0> & tags.ExclusiveMaximum<1000000000>
	>()
]
