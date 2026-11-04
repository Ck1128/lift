# Data safety

All data lives in this browser's IndexedDB on this device. There is no server and no account. Nothing here can be recovered by anyone if it is deleted.

## Deleting everything
Settings, Delete all data. Three separate steps: a warning that lists what will go, typing `DELETE MY DATA`, then a fresh arithmetic question. The typed phrase and the math question only prevent accidental taps. They are not security and do not protect against someone who already has your unlocked phone. Deletion is atomic and verified. Deleted data cannot be recovered. Export first if you might want it back.

## Export
Encrypted by default: PBKDF2-SHA256 (600,000 iterations), AES-256-GCM, random salt and nonce per file, header bound to the ciphertext. Minimum 8-character password. A forgotten password cannot be recovered. A plain (unencrypted) export is available behind a warning. You choose which categories to include.

## Import
Files are treated as untrusted. They are validated and previewed (with counts) before anything changes; the preview never writes. Choose Merge (add what is missing, never overwrite) or Replace (only the categories in the file are replaced). The whole import is one transaction: it all applies or nothing does. Older backups (v1, v2) still import.

## Migration
Database upgrades (now schema v4) only add or default fields. Existing profiles keep working: a profile with no activity choice is treated as Workout + Yoga until you choose.

## Network
Optional Open Food Facts search is off by default. Yoga reference videos load from YouTube only after you tap Play, and YouTube can see that request. Everything else works offline.
