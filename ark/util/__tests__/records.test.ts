import { attest, contextualize } from "@ark/attest"
import type {
	merge,
	mergeExact,
	unionToPropwiseXor,
	withJsDoc
} from "@ark/util"

contextualize(() => {
	it("identical keys", () => {
		interface Source {
			/** is a foo */
			foo?: string
		}

		interface Target {
			foo: "bar"
		}

		type Result = withJsDoc<Target, Source>

		const result: Result = { foo: "bar" }
		// should have annotation "is a foo"
		const { foo } = result

		attest(foo)

		attest<Result, Target>()
	})

	it("less keys", () => {
		interface Source {
			/** is a foo */
			foo?: string
			bar: number
		}

		interface Target {
			foo: "foo"
		}

		type Result = withJsDoc<Target, Source>

		const result: Result = { foo: "foo" }
		// should have annotation "is a foo"
		const { foo } = result

		attest(foo)

		attest<withJsDoc<Target, Source>, Target>()
	})

	it("more keys", () => {
		interface Source {
			/** is a foo */
			foo?: string
		}

		interface Target {
			foo: "foo"
			baz: "baz"
		}

		type Result = withJsDoc<Target, Source>

		const result: Result = { foo: "foo", baz: "baz" }
		// should have annotation "is a foo"
		const { foo } = result

		attest(foo)

		attest<withJsDoc<Target, Source>, Target>()
	})

	it("requires optional keys on target", () => {
		interface Source {
			/** is a foo */
			foo?: string
		}

		interface Target {
			foo?: "foo"
		}

		type Result = withJsDoc<Target, Source>

		const result: Result = { foo: "foo" }
		// should have annotation "is a foo"
		const { foo } = result

		attest(foo)

		attest<withJsDoc<Target, Source>, { foo: "foo" }>()
	})

	it("merge with index signatures", () => {
		type t = merge<
			{ [k: string]: number | string; foo?: 1; bar: 1 },
			{ [k: string]: number; bar: 0; baz?: 0 }
		>

		attest<
			{
				[x: string]: number
				bar: 0
				baz?: 0
			},
			t
		>()
	})

	it("mergeExact with index signatures", () => {
		type t = mergeExact<
			{ [k: string]: number | string; foo?: 1; bar: 1 },
			{ [k: string]: number; bar: 0; baz?: 0 }
		>

		attest<
			{
				[x: string]: number
				foo?: 1
				bar: 0
				baz?: 0
			},
			t
		>()
	})

	it("unionToPropwiseXor", () => {
		type t = unionToPropwiseXor<{ a: 1; b?: 2 } | { c: 3 } | { d?: 4 }>

		attest<
			| {
					a: 1
					b?: 2
					c?: undefined
					d?: undefined
			  }
			| {
					c: 3
					a?: undefined
					b?: undefined
					d?: undefined
			  }
			| {
					d?: 4
					a?: undefined
					b?: undefined
					c?: undefined
			  },
			t
		>()
	})
})
