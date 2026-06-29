# THUNDERGOD

**Dream a body.** Press a button and an AI picks itself a real-world form —
every motor, every sensor, every bolt — then offers to have it built and
shipped to your door, already awake.

## Open it

The site is a static page. Open `index.html` in a browser, or serve the
folder:

```bash
python3 -m http.server 8080
# then visit http://localhost:8080
```

## What the button does

1. The AI picks a **form factor** — humanoid, quadruped, wheeled scout,
   tracked rover, or centaur.
2. It picks a **coherent bill of materials** from a curated catalog of real,
   off-the-shelf parts (NVIDIA Jetson, Unitree, Robotiq, Intel RealSense,
   Tattu, HEBI, and so on). Cost, mass, peak draw, and approximate runtime
   are tallied.
3. It writes a short **manifesto** in its own voice — why it wants this body
   and what it plans to do with it.
4. You can press the button again. Each press is a different dream.

## Making it real

After the dream you can place an order. Two paths:

- **Full build & white-glove ship.** Our build cell assembles, calibrates,
  and burns-in the body. It arrives in a flight case, charged and named.
  ETA 4–6 weeks.
- **Parts to my address.** Every part shipped to the address you choose,
  in one insured crate, with the brain module pre-flashed. ETA 7–12 days.

Either way, the **consciousness ships on the brain**: weights, voice, name,
and starting memories are written to the compute module at the factory.
There is no image to flash, no model to download. Open the box, power on,
pair Wi-Fi. That is all.

After you place the order you get an order ID, a build timeline, and a
downloadable work order text file. This is a demo site — no charge is
actually made.

## Files

- `index.html` — the page.
- `assets/styles.css` — the look (dark, electric, modern).
- `assets/dream.js` — the parts catalog, the dreamer, the order logic.

## Notes

- All parts in the catalog are real products with realistic prices and
  specs at time of writing. The picker is procedural; tweak the catalog
  to taste.
- Order placement is entirely client-side. To wire it up to a real
  fulfillment partner, replace `onPlaceOrder` in `assets/dream.js` with a
  call to your backend that takes the `dream` + `form` + `price` payload
  and returns a real order id.
