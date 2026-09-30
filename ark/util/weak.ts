/// <reference lib="es2021.weakref" />

// engines without either hold every value strongly
const holdsWeakly =
	typeof WeakRef === "function" && typeof FinalizationRegistry === "function"

class Pinned<v> {
	private readonly value: v

	constructor(value: v) {
		this.value = value
	}

	deref(): v {
		return this.value
	}
}

/**
 * A map from strings to objects that holds each value only while something
 * else does, unless the value was pinned or the map is not weak. A collected
 * value reads as absent, and its key is removed.
 */
export class WeakCache<v extends object> {
	private readonly refs = new Map<string, { deref(): v | undefined }>()
	private readonly cleanup: FinalizationRegistry<string> | undefined

	constructor(weak = true) {
		this.cleanup =
			weak && holdsWeakly ?
				new FinalizationRegistry(key => {
					// the key may have been set again before its old value was collected
					if (!this.refs.get(key)?.deref()) this.refs.delete(key)
				})
			:	undefined
	}

	get(key: string): v | undefined {
		return this.refs.get(key)?.deref()
	}

	set(key: string, value: v): v {
		if (!this.cleanup) return this.pin(key, value)
		this.refs.set(key, new WeakRef(value))
		this.cleanup.register(value, key)
		return value
	}

	/** Set key to value, holding it strongly */
	pin(key: string, value: v): v {
		this.refs.set(key, new Pinned(value))
		return value
	}
}
