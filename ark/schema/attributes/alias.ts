export abstract class Alias {
	alias: string

	constructor(schema: { alias?: string }) {
		this.alias = schema.alias ?? "generated"
	}
}
