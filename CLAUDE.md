#What the project is

An online implementation of the Ophir board game — a 2–4 player pickup-and-deliver game where you sail between 7 island zones collecting commodities and metals, then deliver them to the market and temple to earn Victory Points. The game ends when either the temple is fully built (three stacks of donated metals) or the market deck runs out.

  The app is live at play-ophir.cloud but is also designed to run on a local network — you spin it up with Docker, find your
  local IP, and share the link with friends in the same house/LAN. Both versions require an account, but the data always sits next to the server in Docker, wherever it may be deployed.

  ---
  How it works in practice

  Landing page (/) has two options: Learn to Play (tutorial) and Multiplayer. That's it — intentionally minimal.

  Tutorial loads game.html with a pre-baked game state from tutorial_data.json and a TutorialController instead of the real
  GameController. It steps through scripted text panels while letting you interact with the actual game UI.

  Multiplayer flow:
  1. Register/login at /authentication (name + password, no email needed)
  2. Land in the Lobby (/lobby) — a table of all existing games, auto-refreshing every 3 seconds via polling. Shows player count, status, last activity, and whether it's your turn
  3. Each game entry has a link join an existing game; The last link creates a game and redirects you to it.
  4. Enrolment phase: up to 4 players pick a color. The first to join is the session owner and decides when to proceed.
  Spectators can watch without picking a color.
  5. Setup phase: players draft a Specialist card in reverse turn order. Each specialist has a unique ability that shapes your strategy for the whole game.
  6. Play phase: the main game. Each turn you get 2 move actions (drag your ship token to adjacent zones) and can interact with your current location. The canvas is the primary interface — everything happens there
  7. Conclusion: VP tallied, winner shown

  The game canvas (game.html) is almost entirely blank HTML — just a #canvas div, a chat panel, and a few hidden navbar buttons. Everything visible during gameplay (the map, cards, ship tokens, modals, player panels) is rendered by Konva.js at runtime. The only persistent HTML elements are the chat box and those navbar buttons, which get shown/hidden depending on phase and role.

  Players connect via WebSocket to a Game instance and the server broadcasts state updates to all connected clients whenever something changes in that instance. The server keeps a Game instance in memory as long as there are users connected to it. The instance is deleted when all have left. However, MongoDB stores game states frequently so games survive server restarts and total player abandonment. Redis holds session tokens so players don't get logged out on page refresh.

  Admin controls via MongoDB let you tweak game behavior: start with rich players (99 coins), skip the rival ship, shorten the game, restrict which specialists appear in drafts, etc. Useful for testing or running a local session.

  ---
 ## The rough edges (practical)

  The lobby uses polling (every 3s) rather than WebSockets, so it's a bit blunt. The "Your turn!" indicator in the lobby table is a nice touch but relies on that same 3-second cycle. The troubleshooting section in the README ("try refreshing", "log out and back in") suggests the WebSocket reconnection path isn't perfectly smooth yet — though there is a backup reconnection probe in the client code. The README also notes the interface language isn't standardized and is missing quality-of-life animations/transitions, which fits the "work in progress" label it carries.