import { Args, Command, Flags } from "@oclif/core"

export default class Bench extends Command {
    static description = "describe the command here"

    static examples = ["<%= config.bin %> <%= command.id %>"]

    static flags = {
        // flag with a value (-n, --name=VALUE)
        name: Flags.string({ char: "n", description: "name to print" }),
        // flag with no value (-f, --force)
        force: Flags.boolean({ char: "f" })
    }

    static args = {
        file: Args.string({ description: "file to read" })
    }

    public async run(): Promise<void> {
        const { args, flags } = await this.parse(Bench)

        const name = flags.name ?? "world"
        this.log(
            `hello ${name} from /Users/shawnmorreau/Desktop/arktype/dev/attest/attest-cli/src/commands/bench.ts`
        )
        if (args.file && flags.force) {
            this.log(`you input --force and --file: ${args.file}`)
        }
    }
}
