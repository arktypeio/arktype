# Contributing

Thank you so much for making it this far ❤️ If you're intersted in contributing to one of the packages in the Redo repository, we want to make sure we do everything we can to make that process as straightforward and fruitful as possible 🍍🍐🥝 We've put together this guide to cover some of that, but please don't hesitate to comment on any of GitHub issues, create your own, or reach out to me directly at david@redo.qa 🍾

## Code of Conduct

Redo has adopted the [Contributor Covenant](https://www.contributor-covenant.org/) as its Code of Conduct, and we expect project participants to adhere to it.
Please read [the full text](/CODE_OF_CONDUCT.md) so that you can understand what actions will and will not be tolerated.

## Your first Pull Request

Working on your first Pull Request? You can learn how from this free video series:

[How to Contribute to an Open Source Project on GitHub](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github)

To help you get your feet wet and get you familiar with our contribution process, we have a list of [easy issues](https://github.com/redo-qa/redo/issues?q=is:open+is:issue+label:"easy") that contain changes that have a relatively limited scope. This is a great place to get started.

If you decide to fix an issue, please be sure to check the comment thread in case somebody is already working on a fix. If nobody is working on it at the moment, please leave a comment stating that you have started to work on it so other people don’t accidentally duplicate your effort.

If somebody claims an issue but doesn’t follow up for more than a week, it’s fine to take it over but you should still leave a comment.

## Sending a Pull Request

Redo is a community project, so Pull Requests are always welcome, but, before working on a large change, it is best to open an issue first to discuss it with the maintainers.

When in doubt, keep your Pull Requests small. To give a Pull Request the best chance of getting accepted, don't bundle more than one feature or bug fix per Pull Request. It's often best to create two smaller Pull Requests than one big one.

1. [Fork the repository.](https://help.github.com/en/github/getting-started-with-github/fork-a-repo)

2. Clone the fork to your local machine and add upstream remote:

```sh
git clone git@github.com:<yourname>/redo.git && cd redo && git remote add upstream git@github.com:redo-qa/redo.git
```

3. Synchronize your local `master` branch with the upstream one:

```sh
git checkout master
git pull upstream master
```

4. Install dependencies and build:

If you don't have [rush](https://rushjs.io) installed:

```sh
npm install -g @microsoft/rush
```

then:

```sh
rush update # install package.json dependencies across all packages
rush build # builds all packages
```

[Rush](https://rushjs.io) is an awesome way to manage related packages, and mostly preserves the way you'd act with an isolated package outside a monorepo. Take a look at their documention if you need to install new dependencies or are confused about the way packages are linked together and built.

5. Create a new topic branch:

```sh
git checkout -b my-topic-branch
```

6. Once you've made the changes you want, be sure all of our packages still build:

```sh
rush build
```

and that

-   You've added new tests to cover any affected functionality
-   All of our existing tests are passing:

```sh
rush test
```

Once that's done, commit your changes and push to your fork:

```sh
git push -u
```

7. Go to [the repository](https://github.com/redo-qa/redo) and make a Pull Request.

The core team is monitoring for Pull Requests. We will review your Pull Request and either merge it, request changes to it, or close it with an explanation.

## Packages

We use a [rush](https://rushjs.io) monorepo to manage our packages. You might want to make changes to one or more of them depending on the goals of your contribution. Take a look at any of them individually to learn more:

-   [@re-do/app](/pkgs/app): Desktop UI for creating and managing automated tests 🤖
-   [statelessly](pkgs/statelessly): 💪-typed state management with simple shapes🔷
-   [react-statelessly](pkgs/react-statelessly): React hooks for [statelessly](pkgs/statelessly)
-   [@re-do/website](pkgs/website): Source for [our website](https://redo.qa)
-   [@re-do/components](pkgs/components): Shared [React](https://reactjs.org/) component library
-   [@re-do/test](pkgs/test): UI test runner
-   [@re-do/utils](pkgs/utils): Generic utilities
-   [@re-do/model](pkgs/model): Types that model Redo's data
-   [@re-do/configs](pkgs/recommended): Shared configs (TS, jest, etc.)

These packages have left the monorepo nest, but you can visit them in their new homes:

-   [jsrx](https://github.com/re-do/jsrx): Seamlessly write your npm scripts in JS 💊📜
-   [gqlize](pkgs/gqlize): Zero-config graphql query generation 🎁

## Project

Our current and planned work can always be found [here](https://github.com/redo-qa/redo/projects/1). If you want to contribute but aren't sure where to get started, see if any of the issues in our backlog sound interesting! Not all are well-documented, so it usually makes sense to comment on the issue with any questions you may have before you start coding.

## License

By contributing your code to the redo-qa/redo GitHub repository, you agree to license your contribution under the MIT license.

### Attribution note

At Redo, we're huge fans of (https://material-ui.com/). In addition to depending on them for many of our React components, we borrowed parts of this contributing guide from their repo.
