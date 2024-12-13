Web-based implementation of **Ophir** (Terra Nova Games)

Work in progress.

- Web Server supporting up to four active players + spectators
- 90% rules implementation (missing specialists, rival ship for 2 players, and component limits).

Try it out:

1. Install/Update [Node](https://nodejs.org/en/download/package-manager).
2. (optional) Install [Chocolatey](https://docs.chocolatey.org/en-us/chocolatey-components-dependencies-and-support-lifecycle/#supported-windows-versions).
3. (optional) Run `choco install make` to use Makefile commands.

4. Download the codebase.
5. Enter the project root folder and run `npm install` to download dependencies.
6. Create a `.env` file based on `.env.example`.
7. Run `make build` to bundle the code and start the server.

8. To shutdown the server, make a GET request to `/shutdown` containing the environment `SHUTDOWN_AUTH` value as `auth` (ex.: "/shutdown?auth=123456").
9. To start the server again run `make run`.
