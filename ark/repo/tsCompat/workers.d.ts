declare class Blob {
	readonly size: number
}

declare class File extends Blob {
	readonly name: string
}

declare class Headers {
	get(name: string): string | null
}

declare class URL {
	readonly href: string
}
