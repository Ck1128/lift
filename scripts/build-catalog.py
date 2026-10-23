#!/usr/bin/env python3
"""Build src/data/catalog.json from the free-exercise-db dataset.

Source: https://github.com/yuhonas/free-exercise-db (Unlicense / public domain).
Usage:  python3 -I scripts/build-catalog.py path/to/exercises.json src/data/catalog.json
The output is committed to the repo so the app never needs a network request
to read its exercise list. Re-run only when you want to refresh the catalog.
"""
import json
import re
import sys

src, dst = sys.argv[1], sys.argv[2]
data = json.load(open(src))

MUSCLE = {
    'chest': 'chest', 'lats': 'back', 'middle back': 'back', 'lower back': 'back', 'traps': 'back',
    'shoulders': 'shoulders', 'biceps': 'biceps', 'triceps': 'triceps', 'quadriceps': 'quads',
    'hamstrings': 'hamstrings', 'glutes': 'glutes', 'calves': 'calves', 'abdominals': 'core',
    'adductors': 'glutes', 'abductors': 'glutes',
}
EQUIP = {
    'body only': 'bodyweight', 'dumbbell': 'dumbbell', 'barbell': 'barbell', 'e-z curl bar': 'barbell',
    'cable': 'cable', 'machine': 'machine', 'kettlebells': 'kettlebell', 'bands': 'bands',
}
CAP = {'bodyweight': 5, 'dumbbell': 7, 'barbell': 5, 'cable': 6, 'machine': 7, 'smith': 4, 'kettlebell': 3, 'bands': 3}

NEEDS_BENCH = re.compile(r'bench|incline|decline|preacher|skull|lying|step-?up|box', re.I)
NEEDS_BAR = re.compile(r'pull-?up|chin-?up|hanging|muscle-?up|bar hang|toes-to-bar', re.I)
SKIP_NAME = re.compile(r'isometric|wiper|glute ham|natural|nordic|dragon|clean|pistol|snatch|behind the back|jerk|\bdips?\b|stability ball|\bball\b|roller|wheel|sled|rope climb|\bring\b|landmine|suspended|trx|jump|\bhop\b', re.I)


def pattern(name, muscle, force, mechanic):
    n = name.lower()
    if muscle in ('chest', 'shoulders', 'triceps'):
        return 'isolation' if mechanic == 'isolation' else 'push'
    if muscle in ('back', 'biceps'):
        return 'isolation' if mechanic == 'isolation' else 'pull'
    if muscle == 'core':
        return 'core'
    if muscle == 'quads':
        if re.search(r'lunge|split squat|step', n):
            return 'lunge'
        if re.search(r'squat|leg press|hack', n):
            return 'squat'
        return 'isolation'
    if muscle in ('hamstrings', 'glutes'):
        if re.search(r'deadlift|good morning|bridge|thrust|hyperextension|back extension|pull through', n):
            return 'hinge'
        if re.search(r'lunge|split squat|step|squat', n):
            return 'lunge' if 'squat' not in n or 'split' in n else 'squat'
        return 'isolation'
    return 'isolation'


rows = []
for e in data:
    if e.get('category') != 'strength' or e.get('level') not in ('beginner', 'intermediate'):
        continue
    if SKIP_NAME.search(e['name']):
        continue
    prim = [MUSCLE[m] for m in e.get('primaryMuscles', []) if m in MUSCLE]
    if not prim:
        continue
    prim = list(dict.fromkeys(prim))
    sec = [MUSCLE[m] for m in e.get('secondaryMuscles', []) if m in MUSCLE and MUSCLE[m] not in prim]
    sec = list(dict.fromkeys(sec))
    base = EQUIP.get(e.get('equipment'))
    if not base:
        continue
    name = e['name']
    eq = [base]
    if re.search(r'smith', name, re.I):
        eq = ['smith']
    if base != 'machine' and 'smith' not in eq or eq == ['smith']:
        if NEEDS_BENCH.search(name):
            eq.append('bench')
    if base == 'bodyweight' and NEEDS_BAR.search(name):
        eq.append('pullup_bar')
    mech = e.get('mechanic')
    steps = [re.sub(r'\s+', ' ', s).strip()[:240] for s in e.get('instructions', [])[:4]]
    if not steps or not e.get('images'):
        continue
    rows.append({
        'id': e['id'], 'name': name, 'pm': prim[:2], 'sm': sec[:3],
        'pat': pattern(name, prim[0], e.get('force'), mech),
        'eq': eq, 'lvl': e['level'], 'c': mech == 'compound', 'ins': steps, 'img': e['id'],
    })

# Keep a small, readable set: cap per (primary muscle, base equipment).
rows.sort(key=lambda r: (not r['c'], r['lvl'] != 'beginner', len(r['name']), r['name']))
kept, count = [], {}
for r in rows:
    key = (r['pm'][0], r['eq'][0])
    if count.get(key, 0) >= CAP[r['eq'][0]]:
        continue
    count[key] = count.get(key, 0) + 1
    kept.append(r)
kept.sort(key=lambda r: (r['pm'][0], r['eq'][0], r['name']))
json.dump(kept, open(dst, 'w'), separators=(',', ':'), ensure_ascii=False)
print(len(kept), 'exercises written to', dst)
