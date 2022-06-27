# Contributing

Thank you so much for making it this far ❤️ If you're intersted in contributing to one of the packages in the Redo repository, we want to make sure we do everything we can to make that process as straightforward and fruitful as possible.

We've put together this guide to cover some of that, but please don't hesitate to comment on any of GitHub issues, create your own, or reach out to me directly at david@redo.dev 😻

## Code of Conduct

Redo has adopted the [Contributor Covenant](https://www.contributor-covenant.org/) as its Code of Conduct, and we expect project participants to adhere to it.
Please read [the full text](/CODE_OF_CONDUCT.md) so that you can understand what actions will and will not be tolerated.

## Your first Pull Request

Working on your first Pull Request? You can learn how from this free video series:

[How to Contribute to an Open Source Project on GitHub](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github)

To help you get your feet wet and get you familiar with our contribution process, we have a list of [easy issues](https://github.com/re-do/re-po/issues?q=is:open+is:issue+label:"easy") that contain changes that have a relatively limited scope. This is a great place to get started.

If you decide to fix an issue, please be sure to check the comment thread in case somebody is already working on a fix. If nobody is working on it at the moment, please leave a comment stating that you have started to work on it so other people don’t accidentally duplicate your effort.

If somebody claims an issue but doesn’t follow up for more than a week, it’s fine to take it over but you should still leave a comment.

## Sending a Pull Request

Redo is a community project, so Pull Requests are always welcome, but, before working on a large change, it is best to open an issue first to discuss it with the maintainers.

When in doubt, keep your Pull Requests small. To give a Pull Request the best chance of getting accepted, don't bundle more than one feature or bug fix per Pull Request. It's often best to create two smaller Pull Requests than one big one.

1. [Fork the repository.](https://help.github.com/en/github/getting-started-with-github/fork-a-repo)

2. Clone the fork to your local machine and add upstream remote:

```sh
git clone git@github.com:<yourname>/re-po.git && cd redo && git remote add upstream git@github.com:re-do/re-po.git
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
pnpm i # install package.json dependencies across all packages
pnpm build # builds all packages
```

We use a pnpm workspace to manage our packages. The most important things to keep in mind are:

-   The `package.json` at the re-po root contains devDependencies which are not directly imported (like `typescript`, `eslint`, etc.) and scripts that operate on the workspace as a whole (like `build`, which sequentially builds each package in the re-po).
-   Each package has its own `package.json`. These are used the usual way: to manage dependencies directly imported by the code, and to define scripts that run within the scope of that package (those scripts are sometimes called from scripts at the monorepo root).

Take a look at [their documentation](https://pnpm.io/workspaces) if you are confused about the way packages are linked together or need to learn more.

5. Create a new topic branch:

```sh
git checkout -b my-topic-branch
```

6. Once you've made the changes you want to and added corresponding unit tests, run the `pr-checks` command in the project root and address any problems:

```sh
pnpm pr-checks
```

You can also run any of the commands individually:

```sh
pnpm install
pnpm build
pnpm lint
pnpm test
pnpm bench
pnpm build-pages
```

All of these command will run as part of our CI process and must succeed in order for us to accept your Pull Request.

7. Once everything is passing, commit your changes and ensure your fork is up to date:

```sh
git push -u
```

8. Go to [the repository](https://github.com/re-do/re-po) and make a Pull Request.

The core team is monitoring for Pull Requests. We will review your Pull Request and either merge it, request changes to it, or close it with an explanation.

## Packages

We use a [pnpm workspace](https://pnpm.io/workspaces) to manage our packages. You might want to make changes to one or more of them depending on the goals of your contribution. Take a look at any of them individually to learn more:

-   [@re-/model](@re-/model): Beautiful types from IDE to runtime 🧬
-   [@re-/assert](@re-/assert): Seamless testing for types and code ✅
-   [@re-/tools](@re-/tools): Lightweight utilities and types shared across Redo packages 🧰
-   [@re-/node](@re-/node): Node-based utilities, scripts, and configs for Redo packages ⚙️
-   [redo.dev](./redo.dev): Source code for [redo.dev](https://redo.dev) 🔁

## Project

Our current and planned work can always be found [here](https://github.com/re-do/re-po/projects/1). If you want to contribute but aren't sure where to get started, see if any of the issues in our backlog sound interesting! Not all are well-documented, so it usually makes sense to comment on the issue with any questions you may have before you start coding.

## License

By contributing your code to the re-do/re-po GitHub repository, you agree to license your contribution under the MIT license.

### Attribution note

At Redo, we're huge fans of [material-ui](https://mui.com/). In addition to depending on them for many of our React components, we borrowed parts of this contributing guide from their repo.
