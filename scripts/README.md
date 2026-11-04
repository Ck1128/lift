# Scripts

`build-catalog.py` builds `src/data/catalog.json` from the free-exercise-db dataset
(https://github.com/yuhonas/free-exercise-db, Unlicense / public domain).

```bash
curl -L https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json -o exercises.json
python3 -I scripts/build-catalog.py exercises.json src/data/catalog.json
```
