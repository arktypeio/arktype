export abstract class Describable {
	description: string

	abstract writeDefaultDescription(): string

	constructor(rule: unknown, attributes?: { description?: string }) {
		this.description = attributes?.description ?? this.writeDefaultDescription()
	}
}
