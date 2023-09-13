export abstract class Aliasable {
	alias: string

	constructor(schema: { alias?: string }) {
		this.alias = schema.alias ?? "generated"
	}
}
