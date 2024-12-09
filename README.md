Web-based implementation of **Ophir** (Terra Nova Games)

Work in progress.

- Web Server supporting up to four active players + spectators
- 90% rules implementation (missing specialists, rival ship for 2 players, and component limits).

Try it out:

1. Install/Update [https://nodejs.org/en/download/package-manager](Node).
2. (optional) Install [https://docs.chocolatey.org/en-us/chocolatey-components-dependencies-and-support-lifecycle/#supported-windows-versions](Chocolatey).
3. (optional) Run `choco install make`.
4. Download the codebase.
5. Go to the project folder and run `npm install` to download dependencies.
6. Create a `.env` file based on `.env.example`
4. Run `make build` to bundle the code and start the server (or run the individual build commands as described in the `Makefile`).