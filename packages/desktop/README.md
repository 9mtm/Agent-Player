# Dpro desktop app

Electron shell for Dpro. One window, one instance.

- **This computer (default):** the app starts the Dpro backend on the bundled
  Node runtime, on `127.0.0.1` with a random port and a fresh per-launch token
  that every request must carry. The UI bridge (`packages/core-ui/scripts/application-server.cjs`)
  runs inside the app on a second random loopback port and adds the token; the
  page never sees it. On first run the window opens the owner setup with a
  one-time setup code in the URL fragment (no terminal needed).
- **An existing Dpro:** menu → *Connect to an Existing Dpro…* opens another
  Dpro by its `https://` address (or `http://` on this computer, for example
  through an SSH tunnel). Nothing runs locally then.
- **Quit** (menu, Cmd/Ctrl+Q or closing the window) stops the backend first:
  an IPC shutdown request, then a forced stop after 15 s. The backend also
  stops by itself when the app's IPC channel closes (crash, force quit).

Data lives in the OS app-data folder (`~/Library/Application Support/Dpro/data`
on macOS); the redacted backend log in `…/Dpro/logs/backend.log`.

## Run from source

```sh
# once: a live core-ui candidate build (no dev quick-login)
(cd ../core-ui && node scripts/build.cjs --candidate --live-entry)
npm start
```

## Local app build (unsigned)

```sh
npm run stage      # copies Node, backend + modules, UI build into payload/
npm run dist:mac   # DMG + ZIP in release/  (dist:win = NSIS, dist:linux = AppImage)
```

The local payload copies every installed module (large). Release bundles with
a pinned, checksummed Node and production-only modules come later. The app is
not signed yet, so macOS and Windows show their usual warning for apps from
an unidentified developer.

## Tests

```sh
npm test   # process lifecycle with a stand-in backend, settings, setup code
```
