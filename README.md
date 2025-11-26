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
      - Replace the SERVER_ADDRESS value in .env with your local Ethernet address. How to obtain it:
          - Powershell: `Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like '*Ethernet*'}`
          - Git bash: `ipconfig | grep -A 3 'Ethernet' | grep 'IPv4' | awk '{print $NF}'`
      - Run `npm ci && npm run build_server && npm run build_client`.

4. To start the server, run `make run` or `node public/server.cjs`.

Share the server address to play on your network. If you want to open multiple clients on the same machine, make sure each runs on a different browser or incognito window. The browser storage is being used to identify each client and resume the connection in case of page refresh or close, so two or more tabs on the same browser will mirror the same user.

To shut down the server gracefully, input `shutdown` in the running server's command line interface (CLI).
You can also shut it down remotely by making a regular http request to "http://<SERVER_ADDRESS>:<HTTP_PORT>/shutdown?auth=<ADMIN_AUTH>". Use the values in your .env file.

## Troubleshooting
If you experience misalignments or mouse issues, try using an alternative browser (Chrome, Firefox, and Edge should work).
If the session gets stuck, refresh the tab.
If that doesn't work, input `reset` in the running server's CLI or make a request to "http://<SERVER_ADDRESS>:<HTTP_PORT>/reset?auth=<ADMIN_AUTH>"

## How to play

 Any page visitor may become join the game by selecting a color card. Visitors who've selected a color (up to 4) can begin using the built-in chat. There can be any number of spectators.

 There's a decent amount of rules to Ophir. To learn you can:
 - Watch this [how-to-play video](https://youtu.be/pJrDOh6HadI?si=ZOGegm3W-7GWgNP1) from the Dice Tower YouTube channel.
 - Examine to the included [RULES.md](https://github.com/generalustelaru/ophir-2d/blob/main/RULES.md) document.
 - Follow your intuition. The rules are enforced. You can't cheat, only make mistakes.
