/**
 * The `arktype` language server Zed runs for TypeScript, TSX and JavaScript:
 * the language server whose script is the first argument (vtsls), behind a
 * proxy that summarizes ArkType's type errors the way the VS Code extension
 * does through ErrorLens.
 *
 * node main.ts <server script> [server args...]
 */
import { spawn } from "node:child_process"
import { connectProxy } from "./proxy.ts"

const [serverScript, ...serverArgs] = process.argv.slice(2)

if (!serverScript) {
	process.stderr.write("usage: node main.ts <server script> [args...]\n")
	process.exit(1)
}

const server = spawn(process.execPath, [serverScript, ...serverArgs], {
	stdio: ["pipe", "pipe", "inherit"]
})

connectProxy({
	clientIn: process.stdin,
	clientOut: process.stdout,
	serverIn: server.stdin,
	serverOut: server.stdout
})

process.stdin.on("end", () => server.stdin.end())
server.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
for (const signal of ["SIGINT", "SIGTERM"] as const)
	process.on(signal, () => server.kill(signal))
