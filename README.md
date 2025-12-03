Web-based implementation of **Ophir** (Terra Nova Games)
![3 Player game sample](./sample-screenshot.png)

## Description
Ophir is a highly tactical pickup & deliver game for 2-4 players which takes place in a 7-island (zones) archipelago.

During the game, you will sail across the archipelago, picking up commodities and precious metals and supplying them to the market or temple. The game features two types of currency: coins and favor. Coins help you increase your cargo capacity, while favor enables certain privileges during your turn. Both are good for purchasing gold and silver. These precious metals are worth victory points (VP). The goal is to gather the most VP before the game ends.

Work in progress.

- The game is playable but has no lobby (a server supports only one session at a time).
- Barebones persistence. Nothing is saved except the last session.
- The interface language is not yet standardized and is missing quality of life features (utility animations and transitions, tooltips, FTUE screens).

Try it out

## Setup and running
You can set up and run a server fairly easily on your local network.

1. Install [Node](https://nodejs.org/en/download/package-manager).
- You may also want to install Make for a straightforward experience. First, install [Chocolatey](https://docs.chocolatey.org/en-us/chocolatey-components-dependencies-and-support-lifecycle/#supported-windows-versions). Then, open a command tool (i.e., Powershell) and run `choco install make`.

2. Download the project
   - If you have Git, run `git clone https://github.com/generalustelaru/ophir-2d.git`
   - Alternatively, get the zip file [here](https://github.com/generalustelaru/ophir-2d/archive/refs/heads/main.zip). Extract it and enter the root folder (*ophir-2d*).

3. Open a command tool in the project's root folder (*ophir-2d*) -- you should run all commands there.
   - If you have Make, run `make install` to have everything set up and ready.
   - Alternatively, follow these steps:
      - Create a folder named *public* in the root folder.
      - Copy the contents of *src/client/layout/* into the newly created *public* folder.
      - Create a copy of *.env.example* and rename it as *.env*.
      - Replace the SERVER_ADDRESS value in .env with your local Ethernet address. How to obtain it:
          - PowerShell: `Get-NetIPAddress -AddressFamily IPv4 | Where-Object {$_.InterfaceAlias -like '*Ethernet*'}`
          - Git bash: `ipconfig | grep -A 3 'Ethernet' | grep 'IPv4' | awk '{print $NF}'`
      - Create file `db.json` and copy this content into it: `{\"sessions\": [], \"config\":{}}`.
      - Run `npm ci && npm run build_server && npm run build_client`.

4. Start json-server: Run `make db` or `npx json-server --watch db.json`.

5. Start the game server: Open a new terminal and run `make run` or `node public/server.cjs`.

Once you navigate to the server's address you will see a custom URL in your address bar. Share it with your peers for them to connect to the same game. If you want to open multiple clients on the same machine, ensure that each one runs on a different browser or incognito window. The browser storage holds your player identity, so two or more tabs on the same browser will mirror the same user.

To shut down the server gracefully, type `shutdown` in the server command-line interface (CLI).
You can also shut it down remotely by making a regular HTTP request to "http://<SERVER_ADDRESS>:<HTTP_PORT>/shutdown?auth=<ADMIN_AUTH>". Use the values in your .env file.

## Troubleshooting
If you experience mouseover or click issues, try using an alternative browser (Chrome, Firefox, and Edge should work).
If your client gets stuck, refresh the tab.
If that doesn't work, input `reset` in the server CLI or run a request to "http://<SERVER_ADDRESS>:<HTTP_PORT>/reset?auth=<ADMIN_AUTH>" (you may use a regular browser tab for this).

## How to play

Any page visitor may enrol in the game session by selecting a color card. Visitors who've chosen a color (up to four) can begin using the built-in chat. There can be any number of spectators.

 There's a decent number of rules in Ophir. To learn how to play, you can:
 - Watch this [how-to-play video](https://youtu.be/pJrDOh6HadI?si=ZOGegm3W-7GWgNP1) from the Dice Tower YouTube channel.
 - Examine the included [RULES.md](https://github.com/generalustelaru/ophir-2d/blob/main/RULES.md) document.
 - Follow your intuition. The game rules are enforced. You can't cheat but you can certainly make mistakes.
