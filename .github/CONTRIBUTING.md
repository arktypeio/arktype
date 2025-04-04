# Contributing

ArkType values the time of its users and contributors as much as its maintainers, so our goal is for the process to be as efficient and straightforward as possible. Whether this is your first pull request or you're a seasoned open source contributor, this guide is the perfect place to start. If you have any other questions, please don't hesitate to [create an issue on GitHub](https://github.com/arktypeio/arktype/issues/new) or reach out [on our Discord](https://arktype.io/discord).

## Sending a Pull Request

ArkType is a community project, so Pull Requests are always welcome, but, before working on a large change, it is best to open an issue first to discuss it with the maintainers.

When in doubt, keep your Pull Requests small. To give a Pull Request the best chance of getting accepted, don't bundle more than one feature or bug fix per Pull Request. It's often best to create two smaller Pull Requests than one big one.

1. [Fork the repository.](https://help.github.com/en/github/getting-started-with-github/fork-a-repo)

2. Clone the fork to your local machine and add upstream remote:

```sh
git clone git@github.com:<yourname>/arktype.git && cd arktype && git remote add upstream git@github.com:arktypeio/arktype.git
```

3. Synchronize your local `main` branch with the upstream one:

```sh
git checkout main
git pull upstream main
```

4. Install dependencies and build:

If you don't have [pnpm](https://pnpm.io/) installed:

```sh
npm i -g pnpm
```

then:

```sh
pnpm i # install package.json dependencies
pnpm build # builds the package
```

Make sure you are using our repo's pinned version of TypeScript and not one that comes bundled with your editor. In VSCode, you should be automatically prompted to allow this when you open the repo, but otherwise take a look at this explanation for how it can be done [from the VSCode docs](https://code.visualstudio.com/docs/typescript/typescript-compiling#_using-the-workspace-version-of-typescript).

5. Create a new topic branch:

```sh
git checkout -b amazing-feature
```

6. Do your best to write code that is stylistically consistent with its context. The linter will help with this, but it won't catch everything. Here's a few general guidelines:

   - Favor mutation over copying objects in perf-sensitive contexts
   - Favor clarity in naming with the following exceptions:
     - Ubiquitous variables/types. For example, use `s` over `dynamicParserState` for a variable of type DynamicParserState that is used in the same way across many functions.
     - Ephemeral variables whose contents can be trivially inferred from context. For example, prefer `rawKeyDefinitions.map(k => k.trim())` to `rawKeyDefinitions.map(rawKeyDefinition => rawKeyDefinition.trim())`.

We also have some unique casing rules for our TypeScript types to facilitate type-level code that can parallel its runtime implementation and be easily understood:

- Use `PascalCase` for...

  - Entities/non-generic types (e.g. `User`, `SomeData`)
  - Generic types with noun names, like `Array<t>`. As a rule of thumb, your generic should be named this way if all its parameters have defaults (unfortunately TS's builtin `Array` type doesn't have a default parameter, but it probably should have been `unknown`!)

- Use `camelCase` for...

  - Generic types with verb names like `inferDomain<t>`. Types named this way should generally have at least one required parameter.
  - Parameter names, e.g. `t` in `Array<t>`

7. Once you've made the changes you want to and added corresponding unit tests, run the `prChecks` command in the project root and address any errors:

```sh
pnpm prChecks
```

All of these commands will run as part of our CI process and must succeed in order for us to accept your Pull Request.

8. Once everything is passing, commit your changes and ensure your fork is up to date:

```sh
git push -u
```

9. Go to [the repository](https://github.com/arktypeio/arktype) and make a Pull Request.

The core team is monitoring for Pull Requests. We will review your Pull Request and either merge it, request changes to it, or close it with an explanation.

## Project

Our current and planned work can always be found [here](https://github.com/orgs/arktypeio/projects/4). If you want to contribute but aren't sure where to get started, see if any of the issues in our backlog sound interesting! Most are not well-documented, so it usually makes sense to comment on the issue with any questions you may have before you start coding.

## Code of Conduct

ArkType has adopted the [Contributor Covenant](https://www.contributor-covenant.org/) as its Code of Conduct, and we expect project participants to adhere to it.
Please read [the full text](./CODE_OF_CONDUCT.md) so that you can understand what actions will and will not be tolerated.

## License

By contributing your code to the arktypeio/arktype GitHub repository, you agree to license your contribution under the MIT license.
