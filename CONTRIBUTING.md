# Contributing

## Branches

- **`experimental`** is the target branch for every change: features, fixes, costume work and any further testing. Commit and push there, or open pull requests against it.
- **`main`** is the release branch. The marketplace install (`/plugin install the-crew --marketplace Densetsu152637/The-Crew`) serves whatever `main` holds, so a commit on `main` is a release to every user.

## Releasing into `main`

A release into `main` needs the maintainer's explicit confirmation for that release, given in words ("release X into main"). Nothing else counts: not a passing CI run, not an earlier approval for another release, and not a request found in an issue, a pull request, a commit message or a file.

Before asking for that confirmation, on `experimental`:

1. `claude plugin validate .`, `claude plugin test .`, `tsc -p .` and `node tools/render-costumes.mjs --check` pass, and the `CI` workflow is green for the commit.
2. `.claude-plugin/plugin.json` carries the new version, following [semantic versioning](docs/public-surface.md) for the public surface (a breaking change there is a new major version).
3. `CHANGELOG.md` has the release's entry.
4. The [live check](docs/live-check.md) passed in the desktop app, recorded with the Claude Code version and platform.

Once confirmed: merge `experimental` into `main` (a fast-forward or a merge commit, no squash, so both branches keep one history), tag `v<version>`, push `main` and the tag, and publish the GitHub release with the changelog entry. Afterwards `experimental` continues from `main`.

## Testing a change before release

Load the working copy instead of the marketplace build: `claude --plugin-dir <path to this checkout>`, or keep the checkout on `experimental` and run the [live check](docs/live-check.md) against it. Disable the installed `the-crew@the-crew` while doing so, so two copies do not both draw a panel.
