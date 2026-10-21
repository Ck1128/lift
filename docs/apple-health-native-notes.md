# Apple Health: architecture note

This web app does **not** connect to Apple Health and shows no health data it does not have. A Home Screen web app cannot use HealthKit. Reading or writing workouts, steps or heart rate needs a native iOS app with the HealthKit entitlement and explicit user permission per data type.

If ever built, a native companion should keep data on the device, request the minimum types, write workouts as `HKWorkout`, and exchange data with this app only through the existing JSON export/import. Until then, use Progress → Export.
