Web-based implementation of **Ophir** (Terra Nova Games)
![3 Player game sample](./sample-screenshot.png)

## Description
Ophir is a highly-tactical pickup & deliver game for 2-4 players which takes place in a 7 island (zones) archipelago.

During the game, players move their ships across the archipelago, picking up and delivering cargo. Players gain coins by supplying goods to the market, which they can use to upgrade their ship cargo capacity and purchase precious metals to donate towards the temple construction. Metals are worth VP. The goal is to gather the most VP before the game ends.

Work in progress.

- The game is playable but has no lobby (a server supports only one session at a time).
- Barebones persistence. Nothing is saved except the last session.
- The game is currently getting "Specialists" (variable players powers).
- The interface language not yet standardized and missing quality of life features ( animations, transitions, tooltips, FTUE screens).

Try it out

## Setup and running
You can set up and run a server on your local network fairly easily.

1. Install [Node](https://nodejs.org/en/download/package-manager).
- You may want to also install Make for a straightforward experience. First, install [Chocolatey](https://docs.chocolatey.org/en-us/chocolatey-components-dependencies-and-support-lifecycle/#supported-windows-versions). Then open a command tool (i.e. Powershell) and run `choco install make`.

2. Download the project
   - If you have Git, run `git clone https://github.com/generalustelaru/ophir-2d.git`
   - Alternativelty, get the zip file [here](https://github.com/generalustelaru/ophir-2d/archive/refs/heads/main.zip). Extract it and enter the root folder (*ophir-2d*).

3. Open a command tool in the project's root folder (*ophir-2d*) -- all commands should be run there.
   - If you have Make, run `make install` and you're set.
   - Alternatively, follow these steps:
      - Create a folder named *public* in the root folder.
      - Copy the contents of *src/client/layout/* into the newly created *public* folder.
      - Create a copy of *.env.example* and rename it as *.env*.
      - Replace the SERVER_ADDRESS value with your local Ethernet address. How to obtain it:
          - Powershell: `Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like '*Ethernet*'}`
          - Git bash: `ipconfig | grep -A 3 'Ethernet' | grep 'IPv4' | awk '{print $NF}'`
      - Run `npm ci && npm run build_server && npm run build_client`.

Share the server address to play on your network. If you want to open multiple clients on the same machine, make sure each runs on a different browser or incognito window. The browser storage is being used to identify each client and resume the connection in case of page refresh or close, so two or more tabs on the same browser will mirror the same user.

To shut down the server gracefully, input `shutdown` in the running server's command line interface (CLI).
You can also shut it down remotely by making a regular http request to "http://<SERVER_ADDRESS>:<HTTP_PORT>/shutdown?auth=<ADMIN_AUTH>". Use the values in your .env file.

To start the server again run `make run` or `node public/server.cjs`.

## Troubleshooting
If you experience misalignments or mouse issues, try using an alternative browser (Chrome, Firefox, and Edge should work).
If the session gets stuck, refresh the tab.
If that doesn't work, input `reset` in the running server's CLI or make a request to "http://<SERVER_ADDRESS>:<HTTP_PORT>/reset?auth=<ADMIN_AUTH>"

## How to play

 Any page visitor may become the Session Owner by being the first to select a color card.Visitors who've selected a color (up to 4) can begin using the built-in chat. There can be any number of spectators.

 Once there are at least 2 players the Session Owner may click the **Draft** button to initiate the setup (pick from the available specialists), then on **Start** to begin playing. The Session Owner also has the ability to Reset the game at any time (revert to a new open session without players).

 On the board, players are identified by their Ship Figure (on the map center zone) and the Player Card (on the right side of the screen), both displayed in their chosen color. Player Cards are arranged from top to bottom, signifying the turn order. Your Player Card appears on top and also displays your current VP. The three placards on the left display information and actions available at the Market, Exchange, and Temple locations on the map.

 On your turn you will move and get to perform available Actions at your destination by clicking on elements. Interactive elements are generally depicted as cards or icons. Your cursor will turn into a pointer when hovering over them if they're available or into a restricted icon if they're not available. When done, you will have to end your turn by clicking on the green anchor icon (lower right of the map). The next player will be able to take his or her turn immediately after.

 With two players, a third ship is added. Players can move it during their turn when they enter its zone.

 There's a decent amount of rules to Ophir. Refer to the included RULES.md document for details. You can also play by following your intuition. The rules are enforced. You can't cheat, only make mistakes.
