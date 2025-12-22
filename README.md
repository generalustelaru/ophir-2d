Web-based implementation of **Ophir** (Terra Nova Games)
![3 Player game sample](./sample-screenshot.png)

## Description
Ophir is a highly tactical pickup & deliver game for 2-4 players which takes place in a 7-island (zones) archipelago.

During the game, you will sail across the archipelago, picking up commodities and precious metals and supplying them to the market or temple. The game features two types of currency: coins and favor. Coins help you increase your cargo capacity, while favor enables certain privileges during your turn. Both are good for purchasing gold and silver. These precious metals are worth victory points (VP). The goal is to gather the most VP before the game ends.

Work in progress.

- Performance optimizations may still be needed.
- The net code is not yet fully stable.
- The interface language is not yet standardized and is missing quality of life features (more utility animations, transitions, tooltips, FTUE screens).
- The game is fully playable on a local network. I haven't tested deployments yet.

Try it out

## Setup and running
You can set up and run a server fairly easily on your local network.

### Prerequisites

1. Install [Docker Desktop](https://docs.docker.com/desktop/).
   - Open the app and follow its instructions to update WSL if needed.
2. Install [Node](https://nodejs.org/en/download/package-manager).
3. Optional/Recommended: Install **Make**.
      - First, install the [Chocolatey](https://docs.chocolatey.org/en-us/chocolatey-components-dependencies-and-support-lifecycle/#supported-windows-versions) package manager.
      - Then, open a command line (CL) tool (i.e., Powershell) and run `choco install make`.
4. Optional: If on **Windows**, install [Git Bash](https://gitforwindows.org/) (it's bundled with **Git for Windows**).
5. Download the project:
   - If you have Git, run `git clone https://github.com/generalustelaru/ophir-2d.git` (You can use **Git Bash** for this).
   - Alternatively, get the zip file [here](https://github.com/generalustelaru/ophir-2d/archive/refs/heads/main.zip) and extract it.
6. Optional: Install [MongoDB Compass](https://www.mongodb.com/try/download/compass) for easer configuration editing.

### Installation
1. Start **Docker Desktop**
2. Open the project folder (*\ophir-2d*) and start **Bash** (or **Git Bash**) or another CL tool.
3. Run `make install` to have the server set up and ready (otherwise refer to the **Manual Installation** chapter)
4. Start the game server: Open a new CLI window and run `make run` or `node dist/server.cjs`.
6. Copy the server address that appears in the start-up message and open it in a browser.

Click on a ship card to become the session owner. Then copy the URL address and share it with your local network firends for them to connect to your session. If you want to open multiple clients on the same machine, ensure that each one runs on a different browser or incognito window. The browser storage holds your player identity, so two or more tabs on the same browser will mirror the same user.

To shut down the server gracefully, type `shut` in the server CL interface.

## Troubleshooting
If you experience mouseover or click issues, try using an alternative browser (Chrome, Firefox, and Edge should work).
If your client gets stuck, try refreshing the tab.
If that doesn't work, log out and back in again.
If that doesn't work, try restarting the server.

## How to play
Create an account with just a name and password. After logging in, you will reach the "Lobby", a dashboard-like page where you can spectate, join, or start game sessions.
Games start in the "Enrolment" phase, when any visitor can join by selecting a color card. Visitors who've chosen a color (up to four) can begin using the built-in chat. The first player to have joined may proceed towards setup and then start the game at her discretion. There can be any number of spectators.

 There's a decent number of rules in Ophir. To learn how to play, you can:
 - Watch this [how-to-play video](https://youtu.be/pJrDOh6HadI?si=ZOGegm3W-7GWgNP1) from the Dice Tower YouTube channel.
 - Examine the included [RULES.md](https://github.com/generalustelaru/ophir-2d/blob/main/RULES.md) document.
 - Follow your intuition. The game enforces rules. You can't cheat but you can certainly make mistakes!

## Configuration options (admin & 'fun' stuff)
Open **MongoDB Compass** and create a connection to `mongodb://localhost:27017/`

You can edit the "config" values found in the `ophir\config` (`_id: "config_0"`) collection. The game-altering values are applied immediatlely for new games, restarted games, and revived games (went from *Dormant* to *Active*) that haven't passed the enrolment step yet.
- Open the `_id: "config_0"` record and click on the Edit icon.

### Fields:
| Field  | Description | Type |
| - | - | - |
SERVER_NAME | The name that appears in chat for server messages. | `string` |
PLAYER_IDLE_MINUTES | How fast a player can be skipped for not doing anything. | `number` |
GAME_DELETION_HOURS | How quickly an inactive session goes bye-bye. | `number` |
IDLE_TIMEOUT | Time of perceived inactivity (in minutes) for the current player before receiving the idle status. | `number` |
SINGLE_PLAYER | Allows session to start with a single enrolled player. | `boolean` |
NO_RIVAL | Skips including the rival ship and its rules in 2-player games (and solo if SINGLE_PLAYER is enabled). | `boolean` |
RICH_PLAYERS | Players start with 99 coins. | `boolean` |
FAVORED_PLAYERS | Players start with maximum favor (6). | `boolean` |
CARGO_BONUS | Players start with cargo advantages. | * |
SHORT_GAME | Reduces the Temple Track to a single column (the game ends after three metal donations). | `boolean` |
INCLUDE | Array of specialists to appear in the draft. | ** `array` |

- *CARGO_BONUS
   - `0`: No bonus
   - `1`: Upgraded cargo
   - `2` One of each commodity onboard
   - `3` One gold and one silver onboard

- **INCLUDE: `"advisor"`, `"ambassador"`, `"chancellor"`, `"harbormaster"`, `"moneychanger"`, `"navigator"`, `"peddler"`, `"postmaster"`, `"priest"`, `"temple_guard"`.

## The debug command

The `debug <target> <option>` command shows live data as following:
 - `debug games`: Displays the `gameId`s of active games.
 - `debug sockets`: Displays the user identifiers that have an open WS connection.
 - `debug sessions`: Displays current user sessions.
 - `debug <gameId> sockets`: Displays user identifiers currently connected to an active game.
 - `debug <gameId> refs`: Displays active game's internal reference for all players and spectators.

## Manual Installation - punishment for the lazies
0. Don't go back to **Prerequisites**, step **3**.
1. Run `docker run -d -p 27017:27017 --name ophir-mongo mongo` to instantiate a database.
2. Run `docker run -d -p 6379:6379 --name ophir-redis redis` to instantiate caching.
3. Run `docker run -d --name redisinsight -p 5540:5540 redis/redisinsight:latest` for cache monitoring.
4. Run `node seed-db.cjs` to load the game configuration in the DB.
5. Create folders */dist*, */dist/public*, then copy the contents of *src/static/* into *dist/public*.
6. Create a copy of *db_template.json* and rename it as *db.json*.
7. Create a copy of *.env.example* and rename it as *.env*.
8. Replace the SERVER_ADDRESS value in *.env* with your local Ethernet address. How to obtain it:
   - PowerShell: `Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like '*Ethernet*'}`
   - Git bash: `ipconfig | grep -A 3 'Ethernet' | grep 'IPv4' | awk '{print $NF}'`
   - Linux: `hostname -I`
   - Run `npm ci && npm run build_server && npm run build_client`.

## Other hints

Run `npm run ommit_revs` to exclude code maintenance commits from GitBlame.

Go to http://localhost:5540 to visualize user sessions:
- Click **Add Redis database**
- Go to **Connection Settings** and test the default connection (Use "host.docker.internal" as *Host* if it doesn't work)
