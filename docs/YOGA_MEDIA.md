# Yoga reference videos

`src/data/yogaMedia.ts` maps a pose id to a video. The map ships **empty on purpose**: no video link may be added until a person has opened it and confirmed it shows that pose.

To add one: open the video, check the pose and that it is safe for beginners, then add `poseId: { id, title, channel, verifiedOn }` (the id is the 11 characters after `v=`). Tests reject malformed ids and unknown poses.

Without an entry, the app shows a clearly labelled "Search YouTube for this pose" link. That opens a search page, not a reviewed video.

Behaviour: nothing loads until Play is tapped (privacy-friendly youtube-nocookie player, lazy iframe); no autoplay, so reduced-motion needs no special case; offline shows "Video needs internet" and the written steps still work; safety cautions, steps, easier options and common mistakes always show above the video.
