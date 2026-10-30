// run.mjs's scenes (at 8676ca6), verbatim: importing run.mjs runs the
// benchmark, so child.ts and arms.ts read them from here
export const scenes: Record<
	string,
	{ scene: string; docs: string; blocked: boolean; about: string }
> = {
	"verdict-valid": {
		scene: "verdict",
		docs: "valid",
		blocked: false,
		about: "valid documents, the verdict only"
	},
	"verdict-invalid": {
		scene: "verdict",
		docs: "invalid",
		blocked: false,
		about: "invalid documents, the verdict only"
	},
	"errors-invalid": {
		scene: "errors",
		docs: "invalid",
		blocked: false,
		about: "invalid documents, every error produced and iterated"
	},
	"blocked-verdict-valid": {
		scene: "verdict",
		docs: "valid",
		blocked: true,
		about: "valid documents, the verdict, with new Function refused"
	}
}
