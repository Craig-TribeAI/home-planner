# Home Planner: Project Brief for Claude Code

## What this is

A local web app for planning the design of my new home ahead of a July 20 move-in. I have a design brief, listing photos, photos from my tour, mockups I have made, and Pinterest boards with inspiration pinned per room. This app pulls all of that into one visual workspace so I can see everything together.

This is a viewing and collecting tool, not an editing tool. I add material to it over time and browse it. I never edit content inside the app.

## Core design principle

The filesystem is the database. The app scans a `content/` directory and renders whatever it finds. Adding material means saving a file into the right folder (or dragging photos into the upload zone on a room page, which writes to the same folders). There is no backend database, no accounts, no cloud. It runs locally with `npm run dev`.

## What the app shows

**Overview page.** Front-of-house and exterior photos as a hero gallery, the overall design brief rendered below, then a grid of room cards. Each card shows a thumbnail (first original photo) and counts of photos, mockups, and pins.

**Room pages.** One per room. Each page has, in order:

1. The room's section of the design brief
2. **Original**: listing photos and my tour photos, plus a drag-and-drop upload zone that saves files into that room's `original/` folder
3. **Mockups**: a simple flat grid of all mockup images for the room, no grouping or labels
4. **Inspiration**: Pinterest pins synced from that room's board, each linking back to its source pin, with a last-synced indicator

Every image opens in a lightbox. Arrow keys move within the current section. ESC closes. No compare mode is needed.

## Rooms

Six rooms, in this order: Living room, Kitchen, Primary bedroom, Kids' rooms, Bathroom, Playroom.

## Pinterest integration (validated approach)

I keep a separate public Pinterest board per room. Public boards expose an RSS feed at `pinterest.com/{username}/{board-name}.rss`. The feed returns roughly the 20 most recent pins with thumbnail image URLs, and rewriting the image URL path from `/236x/` to `/736x/` yields a high-res version.

Known constraints, accepted:

- Boards must be public. Secret boards have no feed.
- The feed only covers recent pins, so boards with deep history get a one-time manual backfill (saving older pin images directly into the room's `pins/` folder, which the app treats identically to synced pins).
- The sync only ever adds, never deletes. Run it regularly and nothing new is missed.

A `boards.json` file at the project root maps each room slug to its board URL. I will provide the URLs.

## Visual direction

Clean, calm, gallery-like. The photos are the point. Generous whitespace, minimal chrome. A clickable HTML mockup of both pages is included in this folder (`home_planner_ui_mockup_v2.html`) and shows the intended layout, hierarchy, and tone. Match its structure. The styling can be adapted to a normal standalone web app (the mockup uses placeholder boxes where real images go).

## Prompt for Claude Code

Paste the following to kick off the build:

```
Build me a local home design planning app called "home-planner".

ARCHITECTURE
- Vite + React, runs locally with npm run dev
- The filesystem is the database. The app scans a content/ directory
  and renders what it finds. Generate a content manifest at dev-server
  start and on file changes so the UI hot reloads when files are
  added, whether dropped into folders directly or uploaded via the UI.

CONTENT STRUCTURE
content/
  house/
    brief.md          (overall design brief)
    photos/           (exterior and front-of-house shots)
  rooms/
    living-room/
    kitchen/
    primary-bedroom/
    kids-rooms/
    bathroom/
    playroom/
      each room contains:
      brief.md        (that room's section of the brief)
      original/       (listing photos and photos from my tour)
      mockups/        (flat folder of design mockup images, no
                       grouping or labels needed)
      pins/           (synced Pinterest images)
      pins.json       (manifest from sync: image file, title, source URL)

PAGES
1. Overview page: house photos as a hero gallery, the overall brief
   rendered below it, then a grid of room cards in this order:
   Living room, Kitchen, Primary bedroom, Kids' rooms, Bathroom,
   Playroom. Use the first original photo as each card's thumbnail,
   with photo/mockup/pin counts.
2. Room page: room brief at top, then three sections:
   - "Original": photo grid plus a drag-and-drop upload zone
     (also click to browse). Uploads POST to a small dev-server
     endpoint that writes the files into that room's original/
     folder, then the grid refreshes.
   - "Mockups": simple grid of all mockup images, no labels.
   - "Inspiration": Pinterest pins, each linking to its source pin,
     with a last-synced indicator.
- Lightbox on every image, arrow keys move within the current
  section, ESC closes.
- Clean, calm, gallery-like design. The photos are the point.
  Generous whitespace, minimal chrome. See the included
  home_planner_ui_mockup_v2.html for the intended layout and tone.

PINTEREST SYNC
- boards.json at the project root mapping room slugs to public
  Pinterest board URLs.
- npm run sync-pins: for each board, fetch {board-url}.rss, parse
  items, rewrite image URLs from /236x/ to /736x/, download images
  not already present into that room's pins/ folder, update
  pins.json with title and source URL. Never delete, only add.
  Handle failures gracefully and report what synced.

Scaffold the project with all six rooms and placeholder brief.md
files so I can drop my real content in.
```

## My workflow after the build

1. Paste my brief sections into `house/brief.md` and each room's `brief.md`
2. Drop listing and tour photos into each room's `original/` folder, or drag them into the upload zone in the browser
3. Save mockup images into each room's `mockups/` folder as I make them
4. Fill in `boards.json` with my board URLs and run `npm run sync-pins` whenever I have pinned new things
5. One-time backfill of older pins by saving them into each `pins/` folder

## Pre-flight checklist

- Confirm all six Pinterest boards are set to public
- Have board URLs ready for boards.json
- Node and npm installed
