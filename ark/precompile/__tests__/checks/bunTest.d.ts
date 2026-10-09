// bun-types declares globals beside @types/node's, so this declares only what bun.check.ts uses
declare module "bun:test" {
	export const test: (name: string, run: () => Promise<void>) => void
	export const expect: (actual: unknown) => {
		toBe(expected: unknown): void
		rejects: { toThrow(message: string): Promise<void> }
	}
	export const mock: { module(path: string, factory: () => object): void }
}
