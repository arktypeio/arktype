// a loader rewriting a module as a Babel plugin would
export default function (
	this: { getOptions: () => { rewrite: (code: string) => string } },
	source: string
): string {
	return this.getOptions().rewrite(source)
}
