export abstract class Describable {
	description: string

	abstract writeDefaultDescription(): string

	constructor(schema: { description?: string }) {
		this.description = schema.description ?? this.writeDefaultDescription()
	}
}
