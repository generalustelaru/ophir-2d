Web-based implementation of **Ophir** (Terra Nova Games)
![3 Player game sample](./sample-screenshot.png)

## Description
Ophir is a highly tactical pickup & deliver game for 2-4 players which takes place in a 7-island (zones) archipelago.

During the game, you will sail across the archipelago, picking up commodities and precious metals and supplying them to the market or temple. The game features two types of currency: coins and favor. Coins help you increase your cargo capacity, while favor enables certain privileges during your turn. Both are good for purchasing gold and silver. These precious metals are worth victory points (VP). The goal is to gather the most VP before the game ends.

Work in progress.

- Performance optimizations may still be needed.
- The net code is not yet fully stable.
- The interface language is not yet standardized and is missing quality of life features (more utility animations, transitions, tooltips, FTUE screens).

Try it out here -> [play-ophir.cloud](http://play-ophir.cloud/)

## Setup and running
You can set up and run a server quite easily on your local network.

### Prerequisites

1. Install [Docker Desktop](https://docs.docker.com/desktop/).
   - Open the app and follow its instructions to update WSL if needed.
2. Download the project:
   - If you have Git, run `git clone https://github.com/generalustelaru/ophir-2d.git`.
   - Alternatively, get the zip file [here](https://github.com/generalustelaru/ophir-2d/archive/refs/heads/main.zip) and extract it.

### Running

1. Start **Docker Desktop**
2. Enter the project folder (*\ophir-2d*) and open **Bash** (or **Git Bash**) or another CL tool and:
   - Run `make dev` or `docker compose up game-server-dev -d --build` and wait for dependencies to download and instantiate.
   - Run `make seed` or `docker compose exec game-server-dev node seed-db.cjs` to initialize game configuration.

You can access the app on your machine by navigating to `localhost:3001` but if you want to share the link with others on your network, you'll need to find your actual local address and share it as `<ip_address>:3001`. How to find it:
   - PowerShell: `(Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -eq 'Ethernet'}).IPAddress`
   - Git Bash: `ipconfig | grep -A 3 'Ethernet' | grep 'IPv4' | awk '{print $NF}'`
   - Linux: `ip route get 1.1.1.1 | grep -oP 'src \K\S+'`

To turn off the server and all adjacent processes run `make stop` or `docker compose down`.

## Troubleshooting
If you experience mouseover or click issues, try using an alternative browser (Chrome, Firefox, and Edge should work).
If your client gets stuck, try refreshing the tab.
If that doesn't work, log out and back in again.
If that doesn't work, run `make restart` or `docker compose restart game-server-dev`

## How to play
Create an account with just a name and password. After logging in, you will reach the "Lobby", a dashboard-like page where you can spectate, join, or start game sessions.
Games start in the "Enrolment" phase, when any visitor can join by selecting a color card. Visitors who've chosen a color (up to four) can begin using the built-in chat. The first player to have joined may proceed towards setup and then start the game at her discretion. There can be any number of spectators.

 There's a decent number of rules in Ophir. To learn how to play, you can:
 - Watch this [how-to-play video](https://youtu.be/pJrDOh6HadI?si=ZOGegm3W-7GWgNP1) from the Dice Tower YouTube channel.
 - Read the included rules accessible from the About page and the Lobby. These work better as they reference this implementation and also contain pictures.

## Configuration options (admin & 'fun' stuff)
Install [MongoDB Compass](https://www.mongodb.com/try/download/compass) for easer configuration editing.
Linux:
```
wget https://downloads.mongodb.com/compass/mongodb-compass_1.43.0_amd64.deb
sudo apt install ./mongodb-compass_1.43.0_amd64.deb
```
Open it and connect to `mongodb://localhost:27017/gamedb`.

You can edit the "config" values found in the `ophir\config` (`_id: "config_0"`) collection. The game-altering values are applied immediatlely for new games, restarted games, and revived games (went from *Dormant* to *Active*) that haven't passed the enrolment step yet.
- Open the `_id: "config_0"` record and click on the Edit icon.

### Fields:
| Field  | Description | Type |
| - | - | - |
SERVER_NAME | The name that appears in chat for server messages. | `string` |
PLAYER_IDLE_MINUTES | How fast a player can be skipped for not doing anything (currently disabled). | `number` |
USER_SESSION_HOURS | How quickly your session cookie goes bad. | `number` |
GAME_PERSIST_HOURS | How quickly a dormant game goes bye-bye. | `number` |
SINGLE_PLAYER | Allows session to start with a single enrolled player. | `boolean` |
NO_RIVAL | Skips including the rival ship and its rules in 2-player games (and solo if SINGLE_PLAYER is enabled). | `boolean` |
RICH_PLAYERS | Players start with 99 coins. | `boolean` |
FAVORED_PLAYERS | Players start with maximum favor (6). | `boolean` |
CARGO_BONUS | Players start with cargo advantages. | * |
SHORT_GAME | Reduces the Temple Track to a single column (the game ends after three metal donations). | `boolean` |
INCLUDE | Array of specialists to appear in the draft. | ** `array` |

- *CARGO_BONUS
   - `0`: None
   - `1`: Upgraded cargo (four slots)
   - `2` One of each commodity onboard
   - `3` One gold and one silver onboard

- **INCLUDE: `"advisor"`, `"ambassador"`, `"chancellor"`, `"harbormaster"`, `"moneychanger"`, `"navigator"`, `"peddler"`, `"postmaster"`, `"priest"`, `"temple_guard"`.

## Options
If on **Windows**, install [Git Bash](https://gitforwindows.org/) (it's bundled with **Git for Windows**).

Install [Node](https://nodejs.org/en/download/package-manager) to be able to fiddle with the project outside of Docker.

Run `npm run ommit_revs` to exclude code maintenance commits from GitBlame.

Install [JQ](https://jqlang.org/) (Linux: `sudo apt install jq`) then run `./debug.sh` to check data in memory:
   - Response format is usually `{ overview: {}, commands/options: [] }`.
   - Check progresively with `./debug.sh <command> <target> <option>`.

Install **Make** to make use of the Makefile commands.
   - First, install the [Chocolatey](https://docs.chocolatey.org/en-us/chocolatey-components-dependencies-and-support-lifecycle/#supported-windows-versions) package manager.
   - Then, open a command line (CL) tool (i.e., Powershell) and run `choco install make`.

Go to http://localhost:5540 to visualize user sessions:
- Click **Add Redis database**
- Go to **Connection Settings** and test the default connection ("redis://redis:6379");
- (Use "host.docker.internal" as *Host* if it doesn't work)
