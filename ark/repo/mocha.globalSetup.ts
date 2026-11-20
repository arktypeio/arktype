import { cleanup, setup } from "@ark/attest"
// @ark/schema's own tests exercise the language with the algebra installed
import "arksets"

process.env.TZ = "America/New_York"

// what tests read of the processes they spawn and the bundlers they run
// shouldn't depend on whether the environment asks for color, as a CI runner's
// can
process.env.NO_COLOR = "1"
delete process.env.FORCE_COLOR

export const mochaGlobalSetup = (): typeof cleanup =>
	setup({
		typeToStringFormat: {
			useTabs: true
		}
	})

export const mochaGlobalTeardown = cleanup

// a bundler a test runs in this process can set NODE_ENV, as Vite does for a
// production build and Vitest where nothing has, and every later suite's
// processes and builds would inherit it. A suite may leave it set between its
// own tests, so each top-level suite (a file's) starts with the NODE_ENV the
// run did, and the run fails naming each suite that left it changed
const { NODE_ENV } = process.env
const nodeEnvLeaks: string[] = []
let suite: Mocha.Suite | undefined

const checkNodeEnv = () => {
	if (process.env.NODE_ENV === NODE_ENV) return
	nodeEnvLeaks.push(`${suite?.fullTitle()}: ${process.env.NODE_ENV}`)
	if (NODE_ENV === undefined) delete process.env.NODE_ENV
	else process.env.NODE_ENV = NODE_ENV
}

export const mochaHooks = {
	beforeEach(this: Mocha.Context): void {
		let current = this.currentTest?.parent
		while (current?.parent && !current.parent.root) current = current.parent
		if (current === suite) return
		checkNodeEnv()
		suite = current
	},
	afterAll(): void {
		checkNodeEnv()
		if (nodeEnvLeaks.length)
			throw new Error(
				`Suites left NODE_ENV changed:\n${nodeEnvLeaks.join("\n")}`
			)
	}
}
