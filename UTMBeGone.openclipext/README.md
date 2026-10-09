# Clean YouTube Link

Strips playlist IDs, timestamp query parameters, and tracking junk from YouTube video links with a single click.

## Features

- **Removes Playlists & Mixes**: Strips `&list=` and `&start_radio=` so copied URLs link strictly to the video.
- **Removes Timestamps & Extra Query Data**: Strips `&t=`, `&pp=`, `&si=`, `&feature=`, and analytics trackers.
- **Works for Standard and Short URLs**: Handles standard `youtube.com/watch?v=...` as well as shortened `youtu.be/...` links.
- **Preserves Pure Video ID**: Leaves only the clean, original video link.

## What Gets Removed

- `list` (Playlists)
- `start_radio` (Mix radios)
- `t` (Timestamp/start time)
- `pp` (YouTube page/placement tags)
- `si` (Share source tracker)
- `feature` (Navigation tracker)
- Standard tracking tags (`utm_*`, `fbclid`, `gclid`, etc.)
