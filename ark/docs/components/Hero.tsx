import { ArrowRightIcon, PlayIcon } from "lucide-react"
import { MainAutoplayDemo } from "./AutoplayDemo.tsx"
import { Button } from "./Button.tsx"
import { PlatformCloud } from "./PlatformCloud.tsx"

export const Hero = () => (
	<div>
		<div className="flex flex-col md:flex-row justify-between">
			<div className="absolute top-2 left-0 right-0">
				<div className="flex justify-between">
					<PlatformCloud
						main="ts"
						right="vscode"
						top="neovim"
						left="intellij"
					/>
					<PlatformCloud main="js" right="chromium" top="node" left="bun" />
				</div>
			</div>

			<div className="relative w-full flex flex-col md:items-start text-center md:text-left">
				<h1 className="mb-4 text-3xl md:text-8xl">ArkType</h1>
				<p className="text-fd-muted-foreground text-3xl leading-relaxed">
					TypeScript's 1:1 validator, optimized from editor to runtime
				</p>
				<div className="w-full flex-1 flex items-start justify-start mt-6 gap-x-4">
					<Button
						variant="outline"
						href="/playground"
						size="lg"
						className="hidden md:flex"
					>
						Playground
						<PlayIcon />
					</Button>
					<Button variant="filled" href="/docs/intro/setup" size="lg">
						Get Started
						<ArrowRightIcon />
					</Button>
				</div>
			</div>

			<div style={{ padding: "2rem", position: "relative" }}>
				<MainAutoplayDemo />
			</div>
		</div>
	</div>
)
