export abstract class Aliasable {
	alias: string

	constructor(rule: unknown, attributes?: { alias?: string }) {
		this.alias = attributes?.alias ?? "generated"
	}
}
