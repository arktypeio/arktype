// Custom user type
interface Chunk<T> {
	t: T
	isChunk: true
}

// User defines the HKT signature
interface ToChunk extends Kind {
	f(x: this[_]): Chunk<typeof x>
}

// User can now reference the HKT in any ArkType syntax with autocompletion

const s = scope({
	foo: "string",
	toChunk: {} as ToChunk,
	dateChunkArray: "Array<toChunk<Date>>"
}).export()

// Generics can also be instantiated after the scope is defined
const t = s.toChunk("toChunk<boolean[]>")
//    ^?
