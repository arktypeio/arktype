/// <reference lib="es2021.weakref" />

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

export class WeakCache<v extends object> {
	// a Map is faster here than a null-prototype record
	private readonly refs = new Map<string, { deref(): v | undefined }>()
	private readonly cleanup: FinalizationRegistry<string> | undefined

	constructor() {
		this.cleanup =
			holdsWeakly ?
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

	pin(key: string, value: v): v {
		this.refs.set(key, new Pinned(value))
		return value
	}
}
