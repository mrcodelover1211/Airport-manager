# Airport Manager

Mobile-first airport management simulator backed by Supabase and deployed as a static web application.

## Systems

- Real airport catalog and airport-specific infrastructure data
- Runways, taxiways, terminals, gates and stands
- Airport expansion and capacity management
- Aircraft turnaround simulation
- Ground handling vehicles
- ATC, ramp, dispatch, security and maintenance staffing
- Airline contracts and aircraft types
- Airport finances, revenue and expenses
- Reputation and progression
- Operational events
- Supabase persistence and authentication foundation
- GitHub Pages deployment

## Architecture

`index.html` and `style.css` provide the mobile web client. `app.js` connects the UI to Supabase. `game-system.js` contains the simulation rules and can be reused by a future richer 3D renderer.

Supabase stores the authoritative structured airport/game data. The browser uses only the public publishable key. Service-role credentials must never be committed to this repository.

## Airport data

The database is designed to ingest airport records from licensed/open geospatial datasets. Satellite imagery, commercial mapping data, and proprietary 3D assets must only be used where their license permits redistribution and game use.
