import { attest, contextualize } from "@ark/attest"
import { trackAsyncChecks, type } from "arktype"

const deferred = () => {
	let resolve!: (valid: boolean) => void
	let reject!: (e: unknown) => void
	const promise = new Promise<boolean>((res, rej) => {
		resolve = res
		reject = rej
	})
	return { promise, resolve, reject }
}

const tick = () => new Promise(resolve => setTimeout(resolve))

contextualize(() => {
	it("loading until settled", async () => {
		const check = deferred()
		const T = type("string").narrowAsync(() => check.promise)
		attest<string>(T.t)

		const result = T("foo")
		attest<string | type.errors<string>>(result)
		const out = result as type.errors<string>
		attest(out.isLoading).equals(true)
		attest(out[0].isLoading).equals(true)
		attest(out.summary).snap("is still being checked")

		check.resolve(true)
		const settled = await out.settled
		attest<string | type.errors<string>>(settled)
		attest(settled).equals("foo")
	})

	it("settled resolves final errors", async () => {
		const T = type("string").narrowAsync(
			async (s, ctx) => s === "TypeScript" || ctx.mustBe("TypeScript")
		)
		const out = T("JavaScript") as type.errors
		const settled = (await out.settled) as type.errors
		attest(settled.isLoading).equals(false)
		attest(settled.summary).snap('must be TypeScript (was "JavaScript")')
	})

	it("false without an error uses the default message", async () => {
		const T = type("number").narrowAsync(async function isEven(n) {
			return n % 2 === 0
		})
		const settled = await (T(1) as type.errors).settled
		attest(String(settled)).snap("must be valid according to isEven (was 1)")
	})

	it("settled of errors with nothing loading resolves them", async () => {
		const T = type("string").narrowAsync(async () => true)
		const out = T(5) as type.errors
		attest(out.isLoading).equals(false)
		attest(await out.settled).equals(out)
	})

	it("known errors are available while checks run", async () => {
		const check = deferred()
		const T = type({
			name: type("string").narrowAsync(() => check.promise),
			age: "number"
		})
		const result = T({ name: "foo", age: "5" })
		attest<
			{ name: string; age: number } | type.errors<{ name: string; age: number }>
		>(result)
		const out = result as type.errors<typeof T.infer>
		attest<Promise<typeof T.infer | type.errors<typeof T.infer>>>(out.settled)
		attest(out.isLoading).equals(true)
		attest(out.summary).snap(`age must be a number (was a string)
name is still being checked`)
		check.resolve(true)
		attest(String(await out.settled)).snap(
			"age must be a number (was a string)"
		)
	})

	it("chained checks run in parallel", async () => {
		const started: string[] = []
		const a = deferred()
		const b = deferred()
		const T = type("string")
			.narrowAsync(() => (started.push("a"), a.promise))
			.narrowAsync(() => (started.push("b"), b.promise))
		const out = T("foo") as type.errors
		attest(started).equals(["a", "b"])
		a.resolve(true)
		b.resolve(true)
		attest(await out.settled).equals("foo")
	})

	it("narrow after narrowAsync runs immediately", async () => {
		const check = deferred()
		const T = type("string")
			.narrowAsync(() => check.promise)
			.narrow((s, ctx) => s.startsWith("q") || ctx.mustBe("starting with q"))
		const out = T("foo") as type.errors
		// a known failure replaces the loading error at its path
		attest(out.summary).snap('must be starting with q (was "foo")')
		attest(out.isLoading).equals(true)
		attest(out[0].isLoading).equals(false)
		check.resolve(true)
		attest(String(await out.settled)).snap(
			'must be starting with q (was "foo")'
		)
	})

	it("errors are ordered by when they became known", async () => {
		const slow = deferred()
		const fast = deferred()
		let latest: unknown
		const checks = trackAsyncChecks(() => {
			latest = checks.run(() => T("foo"))
		})
		const T = type("string")
			.narrowAsync((_, ctx) => slow.promise.then(() => ctx.mustBe("slow")))
			.narrowAsync((_, ctx) => fast.promise.then(() => ctx.mustBe("fast")))
			.narrow((_, ctx) => ctx.mustBe("sync"))
		latest = checks.run(() => T("foo"))
		attest(String(latest)).snap('must be sync (was "foo")')
		fast.resolve(true)
		await tick()
		const expectedOf = () =>
			(latest as type.errors).flatMap(e => e.flat.map(e => e.expected))
		attest(expectedOf()).equals(["sync", "fast"])
		slow.resolve(true)
		await tick()
		attest(expectedOf()).equals(["sync", "fast", "slow"])
		attest((latest as type.errors).isLoading).equals(false)
	})

	it("assertAsync", async () => {
		const T = type("string").narrowAsync(
			async (s, ctx) => s === "foo" || ctx.mustBe("foo")
		)
		attest<Promise<string>>(T.assertAsync("foo"))
		attest(await T.assertAsync("foo")).equals("foo")
		await T.assertAsync("bar").then(
			() => {
				throw new Error("expected a rejection")
			},
			(e: Error) => attest(e.message).snap('must be foo (was "bar")')
		)
	})

	it("allowsAsync", async () => {
		const T = type("string").narrowAsync(async s => s === "foo")
		attest<Promise<boolean>>(T.allowsAsync("foo"))
		attest(await T.allowsAsync("foo")).equals(true)
		attest(await T.allowsAsync("bar")).equals(false)
		attest(await T.allowsAsync(5)).equals(false)
		// a type guard can't wait
		attest(T.allows("foo")).equals(false)
	})

	it("settled rejects if a check throws", async () => {
		const T = type("string").narrowAsync(async () => {
			throw new Error("offline")
		})
		await (T("foo") as type.errors).settled.then(
			() => {
				throw new Error("expected a rejection")
			},
			(e: Error) => attest(e.message).equals("offline")
		)
	})

	it("a tracked check that throws runs again on the next run", async () => {
		let calls = 0
		let fail = true
		const T = type("string").narrowAsync(async () => {
			calls++
			if (fail) throw new Error("offline")
			return true
		})
		const failures: unknown[] = []
		const checks = trackAsyncChecks(
			() => checks.run(() => T("foo")),
			e => failures.push(e)
		)
		checks.run(() => T("foo"))
		await tick()
		attest(failures.length).equals(1)
		fail = false
		const out = checks.run(() => T("foo")) as type.errors
		attest(calls).equals(2)
		attest(await out.settled).equals("foo")
	})

	it("a tracked check that throws rejects settled without an unhandled rejection", async () => {
		const unhandled: unknown[] = []
		const onUnhandled = (e: unknown) => unhandled.push(e)
		process.prependListener("unhandledRejection", onUnhandled)
		try {
			const T = type("string").narrowAsync(async () => {
				throw new Error("offline")
			})
			const checks = trackAsyncChecks(() => {})
			const out = checks.run(() => T("foo")) as type.errors
			await out.settled.then(
				() => {
					throw new Error("expected a rejection")
				},
				(e: Error) => attest(e.message).equals("offline")
			)
			await tick()
			attest(unhandled).equals([])
		} finally {
			process.off("unhandledRejection", onUnhandled)
		}
	})

	it("standard schema validate resolves once settled", async () => {
		const T = type("string").narrowAsync(
			async (s, ctx) => s === "foo" || ctx.mustBe("foo")
		)
		const valid = T["~standard"].validate("foo")
		attest(valid instanceof Promise).equals(true)
		attest(await valid).equals({ value: "foo" })
		const invalid = await T["~standard"].validate("bar")
		attest(invalid.issues?.map(issue => issue.message)).equals([
			'must be foo (was "bar")'
		])
	})

	it("tracked checks keep the latest result per path", async () => {
		const calls: string[] = []
		const pending = new Map<string, ReturnType<typeof deferred>>()
		const Name = type("string").narrowAsync((s, ctx) => {
			calls.push(s)
			const check = deferred()
			pending.set(s, check)
			return check.promise.then(valid => valid || ctx.mustBe("unused"))
		})
		const Form = type({ a: Name, b: Name })
		let settledCount = 0
		const checks = trackAsyncChecks(() => settledCount++)

		let out = checks.run(() => Form({ a: "x", b: "y" }))
		attest(calls).equals(["x", "y"])
		// re-running with the same values reuses running checks
		checks.run(() => Form({ a: "x", b: "y" }))
		attest(calls).equals(["x", "y"])

		pending.get("x")!.resolve(false)
		await tick()
		attest(settledCount).equals(1)
		out = checks.run(() => Form({ a: "x", b: "y" }))
		attest((out as type.errors).summary).snap(`a must be unused (was "x")
b is still being checked`)

		// b changed, so the check for "y" is stale
		checks.run(() => Form({ a: "x", b: "z" }))
		pending.get("y")!.resolve(false)
		await tick()
		attest(settledCount).equals(1)

		checks.stop()
		pending.get("z")!.resolve(true)
		await tick()
		attest(settledCount).equals(1)
	})

	it("one type is safe to reuse across forms", async () => {
		const pending = new Map<string, ReturnType<typeof deferred>>()
		const Name = type("string").narrowAsync((s, ctx) => {
			const check = deferred()
			pending.set(s, check)
			return check.promise.then(valid => valid || ctx.mustBe("unused"))
		})
		const settledBy = { a: 0, b: 0 }
		const formA = trackAsyncChecks(() => settledBy.a++)
		const formB = trackAsyncChecks(() => settledBy.b++)
		formA.run(() => Name("x"))
		formB.run(() => Name("y"))
		pending.get("x")!.resolve(true)
		await tick()
		attest(settledBy).equals({ a: 1, b: 0 })
		attest(formA.run(() => Name("x"))).equals("x")
		attest((formB.run(() => Name("y")) as type.errors).isLoading).equals(true)
	})

	it("configure sets the default failure message", async () => {
		const T = type("number")
			.narrowAsync(async function isEven(n) {
				return n % 2 === 0
			})
			.configure({ expected: "even" })
		const settled = await (T(1) as type.errors).settled
		attest(String(settled)).snap("must be even (was 1)")
	})

	it("configure sets the loading message", async () => {
		const T = type("string")
			.narrowAsync(async () => false)
			.configure({ message: e => (e.isLoading ? "checking" : "taken") })
		const out = T("foo") as type.errors
		attest(String(out)).snap("checking")
		attest(out.isLoading).equals(true)
		attest(String(await out.settled)).snap("taken")
	})

	it("configure applies to narrow after narrowAsync", () => {
		const T = type("string")
			.narrowAsync(async () => true)
			.narrow(function isLong(s) {
				return s.length > 1
			})
			.configure({ message: "too short" })
		attest(String(T("a"))).snap("too short")
	})

	it("narrow before narrowAsync is unchanged", () => {
		const T = type("string")
			.narrow((s, ctx) => s.length > 1 || ctx.mustBe("long"))
			.narrowAsync(async () => true)
		attest(String(T("a"))).snap('must be long (was "a")')
		attest((T("a") as type.errors).isLoading).equals(false)
	})
})
