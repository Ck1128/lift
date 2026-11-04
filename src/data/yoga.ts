import type { TrainingLevel } from '../engine/types'

/**
 * Yoga catalog: styles and poses. Hand-written, no photos, no audio.
 * It is a curated list of common styles, not every style that exists. New styles and poses are data:
 * add an entry here and bump YOGA_CATALOG_VERSION. No UI change is needed.
 * This is not a substitute for a qualified teacher.
 */
export const YOGA_CATALOG_VERSION = 'yoga-1'

export type YogaStyleId =
  | 'hatha' | 'vinyasa' | 'ashtanga' | 'iyengar' | 'yin' | 'restorative' | 'kundalini'
  | 'power' | 'hot' | 'sivananda' | 'chair' | 'gentle' | 'nidra'
export type PropId = 'mat' | 'blocks' | 'strap' | 'bolster' | 'blanket' | 'chair' | 'cushion' | 'wall'
export const ALL_PROPS: PropId[] = ['mat', 'blocks', 'strap', 'bolster', 'blanket', 'chair', 'cushion', 'wall']
export const PROP_LABEL: Record<PropId, string> = {
  mat: 'Mat', blocks: 'Blocks', strap: 'Strap', bolster: 'Bolster', blanket: 'Blanket', chair: 'Chair', cushion: 'Cushion', wall: 'Wall',
}
export type YogaLocation = 'home' | 'gym' | 'other'
export const LOCATION_LABEL: Record<YogaLocation, string> = { home: 'Home', gym: 'Gym', other: 'Somewhere else' }
export type YogaIntent = 'gentle' | 'moderate' | 'vigorous' | 'flexibility' | 'relaxation' | 'recovery'
export const INTENT_LABEL: Record<YogaIntent, string> = {
  gentle: 'Gentle', moderate: 'Moderate', vigorous: 'Vigorous', flexibility: 'Flexibility', relaxation: 'Relaxation', recovery: 'Recovery',
}
/** Things a person can ask the plan to avoid. A pose carrying that tag is left out. */
export type Restriction = 'wrists' | 'knees' | 'inversions' | 'deep-backbends' | 'balance' | 'lying-on-belly' | 'standing'
export const RESTRICTION_LABEL: Record<Restriction, string> = {
  wrists: 'Weight on my wrists', knees: 'Kneeling or deep knee bends', inversions: 'Head below heart',
  'deep-backbends': 'Deep backbends', balance: 'Balancing on one leg', 'lying-on-belly': 'Lying on my belly', standing: 'Standing poses',
}
export type Role =
  | 'centering' | 'breath' | 'warmup' | 'flow' | 'standing' | 'balance' | 'backbend' | 'fold' | 'twist'
  | 'hip' | 'core' | 'restore' | 'relax' | 'chair'
export type Position = 'standing' | 'seated' | 'supine' | 'prone' | 'kneeling' | 'allfours' | 'chair' | 'side'

export interface YogaPose {
  id: string
  name: string
  sanskrit?: string
  roles: Role[]
  position: Position
  minLevel: TrainingLevel
  /** 1 gentle, 2 moderate, 3 vigorous. */
  intensity: 1 | 2 | 3
  /** Every listed prop must be available. */
  requires: PropId[]
  /** Needs a mat or a blanket under the knees or belly. */
  needsPadding?: boolean
  tags: Restriction[]
  /** Typical hold in seconds in a hatha-style class. */
  hold: number
  /** Done on both sides. */
  sides?: boolean
  /** Only offered in these styles. Missing means any style. */
  styles?: YogaStyleId[]
  instructions: string[]
  cautions: string[]
  modifications: string[]
}

type PoseInput = Omit<YogaPose, 'tags' | 'requires' | 'cautions'> & Partial<Pick<YogaPose, 'tags' | 'requires' | 'cautions'>>
const P = (p: PoseInput): YogaPose => ({ tags: [], requires: [], cautions: [], ...p })

const GEN_CAUTION = 'Move gently. Stop if you feel sharp pain, dizziness or numbness.'

export const POSES: YogaPose[] = [
  // ---------- centering and breath ----------
  P({ id: 'easy-seat', name: 'Easy seat', sanskrit: 'Sukhasana', roles: ['centering'], position: 'seated', minLevel: 'beginner', intensity: 1, hold: 60,
    instructions: ['Sit on the floor with your legs loosely crossed.', 'Lengthen your spine and let your shoulders drop away from your ears.', 'Rest your hands on your knees and close your eyes or soften your gaze.', 'Breathe naturally and notice how you feel.'],
    cautions: ['If your knees or hips ache, change how you sit.'], modifications: ['Sit on a folded blanket or cushion to lift your hips above your knees.', 'Sit on a chair with both feet on the floor.'] }),
  P({ id: 'natural-breath', name: 'Breath awareness', roles: ['breath'], position: 'seated', minLevel: 'beginner', intensity: 1, hold: 90,
    instructions: ['Sit or lie comfortably.', 'Breathe in through your nose for a slow count of four and out for a slow count of four. Do not strain.', 'Feel your belly and ribs move. If your mind wanders, gently return to the breath.'],
    cautions: ['Keep the breath easy. Return to normal breathing if you feel lightheaded.'], modifications: ['Place a hand on your belly to feel it rise and fall.', 'Lie on your back with your knees bent if sitting is uncomfortable.'] }),
  P({ id: 'three-part-breath', name: 'Three-part breath', sanskrit: 'Dirga pranayama', roles: ['breath'], position: 'seated', minLevel: 'beginner', intensity: 1, hold: 90,
    instructions: ['Sit tall or lie on your back.', 'Breathe in and fill your belly, then your ribs, then your upper chest.', 'Breathe out in the reverse order: upper chest, ribs, belly.', 'Keep it smooth and quiet.'],
    cautions: ['Do not hold your breath. Stop if you feel dizzy.'], modifications: ['Make each breath shorter if long breaths feel strained.'] }),
  P({ id: 'ocean-breath', name: 'Ocean breath', sanskrit: 'Ujjayi pranayama', roles: ['breath'], position: 'seated', minLevel: 'beginner', intensity: 1, hold: 90, styles: ['hatha', 'vinyasa', 'ashtanga', 'power', 'iyengar', 'sivananda', 'hot'],
    instructions: ['Sit tall. Breathe in through your nose.', 'Breathe out through your nose while gently narrowing the back of your throat, like fogging a mirror with your mouth closed. You should hear a soft ocean sound.', 'Keep the breath smooth and even. This breath is used during flowing poses.'],
    cautions: ['Keep the throat narrowing very light. Return to ordinary breathing if it feels tight.'], modifications: ['Practise with an open mouth ("ha") first to find the sound.'] }),
  P({ id: 'alternate-nostril', name: 'Alternate nostril breathing', sanskrit: 'Nadi shodhana', roles: ['breath'], position: 'seated', minLevel: 'beginner', intensity: 1, hold: 120,
    instructions: ['Sit tall. Rest your left hand on your knee.', 'Close your right nostril with your right thumb and breathe in slowly through the left.', 'Close the left nostril with your ring finger, release the right and breathe out through the right.', 'Breathe in through the right, switch, and breathe out through the left. That is one round. Continue for several rounds.'],
    cautions: ['Do not hold your breath. Skip this if your nose is blocked, and stop if you feel dizzy.'], modifications: ['Rest your hand in your lap and just imagine the breath moving from side to side.'] }),
  P({ id: 'humming-bee', name: 'Humming bee breath', sanskrit: 'Bhramari', roles: ['breath'], position: 'seated', minLevel: 'beginner', intensity: 1, hold: 60, styles: ['kundalini', 'gentle', 'restorative', 'sivananda', 'hatha'],
    instructions: ['Sit tall with your lips closed and teeth slightly apart.', 'Breathe in through your nose.', 'Breathe out slowly while making a soft humming sound, like a bee.', 'Feel the vibration in your face and chest. Repeat five to eight times.'],
    cautions: ['Keep the sound gentle.'], modifications: ['Hum quietly, or just imagine the sound.'] }),
  P({ id: 'breath-of-fire', name: 'Rapid belly breathing', sanskrit: 'Kapalabhati / breath of fire', roles: ['breath'], position: 'seated', minLevel: 'intermediate', intensity: 2, hold: 45, styles: ['kundalini', 'sivananda'],
    instructions: ['Sit tall with a relaxed belly.', 'Breathe in naturally, then pump the belly in with short, sharp exhales through the nose. Let each inhale happen on its own.', 'Do about 20 quick breaths, then breathe normally and rest. Repeat for two or three rounds.'],
    cautions: ['Skip this if you are pregnant, have high blood pressure, heart disease, a hernia, epilepsy or recent surgery, or if you get dizzy easily. Stop right away if you feel lightheaded.'],
    modifications: ['Go slowly: one exhale every second.', 'Replace this with three-part breath.'] }),

  // ---------- warm-up ----------
  P({ id: 'neck-release', name: 'Gentle neck release', roles: ['warmup'], position: 'seated', minLevel: 'beginner', intensity: 1, hold: 40, sides: true,
    instructions: ['Sit tall. Let your right ear lower toward your right shoulder. Do not pull.', 'Breathe slowly and let your neck lengthen. Come back to centre and repeat on the left.'],
    cautions: ['Do not roll your head in full circles. Stop if you feel pinching or tingling.'], modifications: ['Rest your hand lightly on the side of your head for a little extra weight.'] }),
  P({ id: 'shoulder-rolls', name: 'Shoulder rolls', roles: ['warmup'], position: 'seated', minLevel: 'beginner', intensity: 1, hold: 40,
    instructions: ['Sit or stand tall.', 'Lift your shoulders toward your ears, roll them back and down in a slow circle. Repeat several times.', 'Reverse the direction.'],
    cautions: [GEN_CAUTION], modifications: ['Do one shoulder at a time.'] }),
  P({ id: 'cat-cow', name: 'Cat and cow', sanskrit: 'Marjaryasana / Bitilasana', roles: ['warmup'], position: 'allfours', minLevel: 'beginner', intensity: 1, hold: 60, needsPadding: true, tags: ['wrists', 'knees'],
    instructions: ['Come onto hands and knees with wrists under shoulders and knees under hips.', 'Breathe in: let your belly drop and lift your chest and tailbone (cow).', 'Breathe out: round your spine toward the ceiling and tuck your chin (cat).', 'Move slowly with your breath.'],
    cautions: ['Pad your knees. Skip it if your wrists hurt.'], modifications: ['Make fists or rest on your forearms if your wrists are sensitive.', 'Do the same movement sitting on a chair, with hands on your knees.'] }),
  P({ id: 'seated-spinal-flex', name: 'Seated spinal flex', roles: ['warmup'], position: 'seated', minLevel: 'beginner', intensity: 1, hold: 60, styles: ['kundalini', 'gentle', 'hatha', 'sivananda', 'hot'],
    instructions: ['Sit in easy seat and hold your shins or knees.', 'Breathe in and lift your chest forward, arching gently.', 'Breathe out and round your back, tucking your chin.', 'Continue at an easy pace for about a minute.'],
    cautions: [GEN_CAUTION], modifications: ['Sit on a chair and hold your knees.'] }),
  P({ id: 'mountain', name: 'Mountain pose', sanskrit: 'Tadasana', roles: ['warmup', 'standing'], position: 'standing', minLevel: 'beginner', intensity: 1, hold: 40, tags: ['standing'],
    instructions: ['Stand with your feet hip-width apart and your weight spread evenly across both feet.', 'Lengthen your spine and let your arms hang by your sides, palms facing forward.', 'Breathe slowly and feel steady.'],
    cautions: ['Keep your knees soft, not locked.'], modifications: ['Stand with your back against a wall.'] }),
  P({ id: 'standing-side-bend', name: 'Standing side bend', roles: ['warmup'], position: 'standing', minLevel: 'beginner', intensity: 1, hold: 40, sides: true, tags: ['standing'],
    instructions: ['Stand with your feet hip-width apart. Reach your right arm overhead.', 'Lean gently to the left, lengthening along your right side.', 'Breathe, then come up and repeat on the other side.'],
    cautions: ['Keep your hips level and avoid leaning forward or back.'], modifications: ['Do it seated on a chair.'] }),
  P({ id: 'standing-forward-fold', name: 'Standing forward fold', sanskrit: 'Uttanasana', roles: ['fold', 'warmup'], position: 'standing', minLevel: 'beginner', intensity: 1, hold: 40, tags: ['standing', 'inversions'],
    instructions: ['Stand with your feet hip-width apart.', 'Bend your knees generously and hinge forward from your hips.', 'Let your head and arms hang, or hold opposite elbows.', 'Rise slowly with a flat back and bent knees.'],
    cautions: ['Come up slowly. Avoid if you have a recent back injury or you feel dizzy when your head is low.'], modifications: ['Rest your hands on blocks or a chair seat.', 'Bend your knees as much as you like.'] }),
  P({ id: 'sun-salutation-a', name: 'Sun salutation A (simplified)', sanskrit: 'Surya Namaskar A', roles: ['flow', 'warmup'], position: 'standing', minLevel: 'beginner', intensity: 2, hold: 60, tags: ['wrists', 'standing', 'inversions'], needsPadding: true,
    instructions: ['Stand in mountain pose. Breathe in and sweep your arms overhead.', 'Breathe out, fold forward with soft knees.', 'Breathe in, lift halfway with a flat back. Breathe out, step or walk back to a plank, lower your knees, chest and chin to the floor.', 'Breathe in and press into a low cobra. Breathe out and lift your hips to downward dog.', 'Hold for three breaths, then walk your feet to your hands, rise up and sweep your arms overhead. Repeat slowly.'],
    cautions: ['Keep your movement smaller if your wrists, shoulders or lower back complain.'], modifications: ['Skip the plank and lower down from hands and knees.', 'Stay standing: reach up, fold, lift, fold, reach up (a standing version).'] }),
  P({ id: 'sun-salutation-b', name: 'Sun salutation B (simplified)', sanskrit: 'Surya Namaskar B', roles: ['flow'], position: 'standing', minLevel: 'intermediate', intensity: 3, hold: 80, tags: ['wrists', 'knees', 'standing', 'inversions'], needsPadding: true,
    instructions: ['Begin in chair pose, knees bent and arms overhead.', 'Fold forward, lift halfway, step back to plank and lower with control.', 'Press into cobra, then lift to downward dog.', 'Step your right foot forward into a lunge with arms overhead (warrior one). Repeat the plank-lower-cobra-dog sequence, then lunge with the left foot.', 'Walk forward, rise to chair pose and stand. Repeat.'],
    cautions: ['Rest in child\'s pose whenever you need to.'], modifications: ['Lower your knees in the plank and lunge.', 'Do fewer rounds with a longer pause between them.'] }),
  P({ id: 'down-dog', name: 'Downward-facing dog', sanskrit: 'Adho mukha svanasana', roles: ['flow', 'standing'], position: 'allfours', minLevel: 'beginner', intensity: 2, hold: 40, tags: ['wrists', 'inversions'], needsPadding: true,
    instructions: ['Start on hands and knees. Spread your fingers wide.', 'Tuck your toes and lift your hips up and back so your body makes an upside-down V.', 'Press the floor away and let your head hang. Bend your knees as much as you need to keep your back long.', 'Lower to your knees to come out.'],
    cautions: ['Avoid or modify if you have wrist pain, high blood pressure that is not controlled, or an eye or head condition where head-below-heart is advised against.'], modifications: ['Bend your knees deeply.', 'Place your hands on a wall or chair seat and walk your feet back for a gentler version.'] }),
  P({ id: 'child', name: 'Child\'s pose', sanskrit: 'Balasana', roles: ['restore', 'fold'], position: 'kneeling', minLevel: 'beginner', intensity: 1, hold: 60, needsPadding: true, tags: ['knees'],
    instructions: ['Kneel and bring your big toes together, knees apart.', 'Sit back toward your heels and fold forward, resting your forehead on the floor.', 'Reach your arms forward or rest them by your sides.', 'Breathe into your back.'],
    cautions: ['Come out if you feel pain in your knees.'], modifications: ['Rest your forehead on a block or stacked fists.', 'Place a folded blanket between your hips and heels.', 'Place a bolster under your chest.'] }),
  P({ id: 'bird-dog', name: 'Bird-dog', roles: ['core', 'balance'], position: 'allfours', minLevel: 'beginner', intensity: 2, hold: 30, sides: true, needsPadding: true, tags: ['wrists', 'knees', 'balance'],
    instructions: ['Start on hands and knees.', 'Reach your right arm forward and your left leg back, keeping your hips level.', 'Hold, then return and switch sides.'],
    cautions: ['Do not let your lower back sag.'], modifications: ['Lift only your leg, or only your arm.'] }),

  // ---------- standing ----------
  P({ id: 'chair-pose', name: 'Chair pose', sanskrit: 'Utkatasana', roles: ['standing'], position: 'standing', minLevel: 'beginner', intensity: 2, hold: 30, tags: ['standing', 'knees'],
    instructions: ['Stand with your feet together or hip-width apart.', 'Bend your knees and sit your hips back as if sitting into a chair.', 'Reach your arms forward or overhead and keep your chest lifted.', 'Press back up to standing.'],
    cautions: ['Keep your knees behind your toes if they complain.'], modifications: ['Bend your knees less.', 'Put your back against a wall.'] }),
  P({ id: 'warrior-2', name: 'Warrior two', sanskrit: 'Virabhadrasana II', roles: ['standing'], position: 'standing', minLevel: 'beginner', intensity: 2, hold: 30, sides: true, tags: ['standing', 'knees'],
    instructions: ['Step your feet about a leg-length apart. Turn your right foot out and your left foot slightly in.', 'Bend your right knee over your ankle and stretch your arms out to the sides.', 'Look over your front hand and keep your torso upright.', 'Hold, then switch sides.'],
    cautions: ['Keep your front knee in line with your second toe.'], modifications: ['Shorten your stance and bend the knee less.'] }),
  P({ id: 'warrior-1', name: 'Warrior one', sanskrit: 'Virabhadrasana I', roles: ['standing'], position: 'standing', minLevel: 'beginner', intensity: 2, hold: 30, sides: true, tags: ['standing', 'knees'],
    instructions: ['Step your left foot back about a leg-length and turn it out slightly.', 'Bend your right knee over your ankle and face your hips forward.', 'Raise your arms overhead, palms facing or apart.', 'Hold, then switch.'],
    cautions: ['If your back knee or hip feels tight, shorten your stance.'], modifications: ['Keep your hands on your hips.', 'Hold a chair for balance.'] }),
  P({ id: 'triangle', name: 'Triangle pose', sanskrit: 'Trikonasana', roles: ['standing'], position: 'standing', minLevel: 'beginner', intensity: 2, hold: 30, sides: true, tags: ['standing', 'inversions'],
    instructions: ['Stand with your feet about a leg-length apart. Turn your right foot out.', 'Reach your right arm forward, then hinge from your hip and rest your right hand on your shin, a block or the floor.', 'Stretch your left arm up and look forward or up.', 'Come up on an inhale and switch sides.'],
    cautions: ['Do not lock your front knee. Keep your chest open.'], modifications: ['Rest your hand on a block or a chair seat.', 'Rest your back against a wall.'] }),
  P({ id: 'wide-leg-fold', name: 'Wide-leg forward fold', sanskrit: 'Prasarita padottanasana', roles: ['fold', 'standing'], position: 'standing', minLevel: 'beginner', intensity: 1, hold: 40, tags: ['standing', 'inversions'],
    instructions: ['Step your feet wide apart and point your toes forward or slightly in.', 'Hinge from your hips and fold forward with a long spine.', 'Let your hands rest on the floor, blocks or your shins.', 'Rise slowly with a flat back.'],
    cautions: ['Come up slowly to avoid dizziness.'], modifications: ['Use blocks or a chair under your hands.', 'Place your hands on your hips and fold halfway.'] }),
  P({ id: 'goddess', name: 'Goddess pose', sanskrit: 'Utkata konasana', roles: ['standing'], position: 'standing', minLevel: 'beginner', intensity: 2, hold: 30, tags: ['standing', 'knees'],
    instructions: ['Step your feet wide and turn your toes out.', 'Bend your knees over your ankles and keep your torso upright.', 'Bring your hands to your chest or raise them in cactus arms.', 'Press up to stand.'],
    cautions: ['Keep your knees tracking over your toes.'], modifications: ['Come up higher to reduce the load.'] }),
  P({ id: 'side-angle', name: 'Extended side angle', sanskrit: 'Utthita parsvakonasana', roles: ['standing'], position: 'standing', minLevel: 'intermediate', intensity: 2, hold: 30, sides: true, tags: ['standing', 'knees'],
    instructions: ['From warrior two, rest your right forearm on your right thigh or place your hand on a block.', 'Reach your left arm over your ear, forming one long line.', 'Rotate your chest open and keep your front knee bent.', 'Come up on an inhale and switch.'],
    cautions: ['Do not let the front knee collapse inward.'], modifications: ['Rest your elbow on your thigh.', 'Use a block under your hand.'] }),
  P({ id: 'crescent-lunge', name: 'High lunge', sanskrit: 'Anjaneyasana (crescent)', roles: ['standing'], position: 'standing', minLevel: 'intermediate', intensity: 2, hold: 30, sides: true, tags: ['standing', 'knees'],
    instructions: ['Step your right foot forward into a lunge with your back heel lifted.', 'Bend your front knee over your ankle and sink your hips.', 'Reach your arms overhead and keep your ribs drawn in.', 'Step back and switch sides.'],
    cautions: ['Shorten your stance if you feel strain in your back.'], modifications: ['Rest your hands on your front thigh or on blocks.'] }),
  P({ id: 'low-lunge', name: 'Low lunge', roles: ['hip', 'standing'], position: 'kneeling', minLevel: 'beginner', intensity: 2, hold: 40, sides: true, needsPadding: true, tags: ['knees', 'standing'],
    instructions: ['From hands and knees, step your right foot forward between your hands.', 'Lower your back knee to the floor and slide it back until you feel a stretch at the front of your hip.', 'Lift your torso and rest your hands on your front thigh.', 'Breathe, then switch sides.'],
    cautions: ['Pad your back knee well.'], modifications: ['Rest your hands on blocks.', 'Fold a blanket under the knee.'] }),
  P({ id: 'tree', name: 'Tree pose', sanskrit: 'Vrksasana', roles: ['balance'], position: 'standing', minLevel: 'beginner', intensity: 1, hold: 30, sides: true, tags: ['balance', 'standing'],
    instructions: ['Stand tall and shift your weight onto your left foot.', 'Place the sole of your right foot on your left calf or inner thigh. Do not press into the side of the knee.', 'Bring your hands to your chest or reach them overhead.', 'Fix your gaze on one spot. Switch sides.'],
    cautions: ['Never rest your foot on the side of your knee.'], modifications: ['Keep your toes on the floor and your heel against your ankle.', 'Stand next to a wall for support.'] }),
  P({ id: 'tree-wall', name: 'Tree pose at the wall', roles: ['balance'], position: 'standing', minLevel: 'beginner', intensity: 1, hold: 30, sides: true, requires: ['wall'], tags: ['standing'],
    instructions: ['Stand next to a wall with your hand on it for support.', 'Place the sole of your far foot on your standing calf or inner thigh.', 'Lift your other hand overhead. Switch sides.'],
    cautions: ['Never rest your foot on the side of your knee.'], modifications: ['Keep your toes on the floor.'] }),
  P({ id: 'eagle', name: 'Eagle pose', sanskrit: 'Garudasana', roles: ['balance'], position: 'standing', minLevel: 'intermediate', intensity: 2, hold: 25, sides: true, tags: ['balance', 'standing', 'knees'],
    instructions: ['Stand and bend your knees slightly.', 'Cross your right thigh over your left and hook your foot behind your calf if you can.', 'Cross your arms at the elbows and lift your forearms.', 'Sit your hips back a little. Hold, then switch.'],
    cautions: ['Skip the wrap if you feel pressure in your knees.'], modifications: ['Rest your toes on the floor.', 'Hug yourself with your arms instead of wrapping them.'] }),
  P({ id: 'warrior-3', name: 'Warrior three', sanskrit: 'Virabhadrasana III', roles: ['balance'], position: 'standing', minLevel: 'intermediate', intensity: 2, hold: 20, sides: true, tags: ['balance', 'standing', 'inversions'],
    instructions: ['Stand on your right leg with a soft knee.', 'Hinge forward at the hip and lift your left leg behind you, keeping your hips level.', 'Reach your arms forward or by your sides.', 'Come up slowly and switch.'],
    cautions: ['Keep your standing knee slightly bent.'], modifications: ['Rest your hands on a wall or the back of a chair.', 'Keep your lifted foot low.'] }),
  P({ id: 'half-moon', name: 'Half moon', sanskrit: 'Ardha chandrasana', roles: ['balance'], position: 'standing', minLevel: 'regular', intensity: 2, hold: 20, sides: true, tags: ['balance', 'standing'],
    instructions: ['From triangle pose, bend your front knee and place your hand on a block a short distance ahead of your foot.', 'Lift your back leg to hip height and stack your hips.', 'Lift your top arm and rotate your chest open.', 'Lower with control and switch.'],
    cautions: ['Use a block. Do not rush to straighten your standing leg.'], modifications: ['Rest your back against a wall.', 'Keep your lifted leg low.'] }),

  // ---------- floor: backbends, folds, hips, twists ----------
  P({ id: 'cobra', name: 'Low cobra', sanskrit: 'Bhujangasana', roles: ['backbend'], position: 'prone', minLevel: 'beginner', intensity: 2, hold: 25, needsPadding: true, tags: ['lying-on-belly', 'deep-backbends', 'wrists'],
    instructions: ['Lie on your belly with your hands under your shoulders and elbows hugging your sides.', 'Press the tops of your feet into the floor and lift your chest a few inches, keeping your hips down.', 'Keep your neck long. Lower slowly.'],
    cautions: ['Lift only as high as feels comfortable. Skip it during pregnancy or if it pinches your lower back.'], modifications: ['Keep your hands light and use your back muscles to lift.', 'Rest on your forearms (sphinx).'] }),
  P({ id: 'sphinx', name: 'Sphinx', roles: ['backbend'], position: 'prone', minLevel: 'beginner', intensity: 1, hold: 60, needsPadding: true, tags: ['lying-on-belly'],
    instructions: ['Lie on your belly and prop yourself on your forearms with elbows under your shoulders.', 'Lengthen your chest forward and relax your shoulders.', 'Breathe slowly.'],
    cautions: ['Come down if you feel pinching in your lower back.'], modifications: ['Slide your elbows forward to lower the height.'] }),
  P({ id: 'locust', name: 'Locust', sanskrit: 'Salabhasana', roles: ['backbend', 'core'], position: 'prone', minLevel: 'intermediate', intensity: 2, hold: 20, needsPadding: true, tags: ['lying-on-belly', 'deep-backbends'],
    instructions: ['Lie on your belly with your arms by your sides.', 'Lift your chest and legs a few inches off the floor.', 'Reach back through your fingertips and keep your neck long.', 'Lower with control.'],
    cautions: ['Do not crank your head back.'], modifications: ['Lift only your chest, or only your legs.'] }),
  P({ id: 'bridge', name: 'Bridge pose', sanskrit: 'Setu bandhasana', roles: ['backbend'], position: 'supine', minLevel: 'beginner', intensity: 2, hold: 30,
    instructions: ['Lie on your back with your knees bent and feet flat, hip-width apart.', 'Press into your feet and lift your hips.', 'Keep your knees over your ankles and your neck relaxed.', 'Lower slowly, one vertebra at a time.'],
    cautions: ['Do not turn your head while your hips are lifted.'], modifications: ['Lift your hips less high.', 'Place a block under your sacrum (see supported bridge).'] }),
  P({ id: 'camel', name: 'Camel', sanskrit: 'Ustrasana', roles: ['backbend'], position: 'kneeling', minLevel: 'regular', intensity: 2, hold: 20, needsPadding: true, tags: ['deep-backbends', 'knees'],
    instructions: ['Kneel with your knees hip-width apart and your hands on your lower back.', 'Press your hips forward and lift your chest, gently arching backward.', 'Keep your neck long and breathe. To come up, lead with your chest.'],
    cautions: ['Skip this if you have neck or lower-back problems. Do not drop your head back if it feels strained.'], modifications: ['Keep your hands on your lower back.', 'Tuck your toes and rest your hands on blocks.'] }),
  P({ id: 'seated-forward-fold', name: 'Seated forward fold', sanskrit: 'Paschimottanasana', roles: ['fold'], position: 'seated', minLevel: 'beginner', intensity: 1, hold: 45,
    instructions: ['Sit with your legs extended. Sit on a folded blanket if your hips feel tight.', 'Flex your feet and lengthen your spine forward.', 'Hinge from your hips and reach toward your shins or feet. Do not force it.'],
    cautions: ['Keep your back long, not rounded and strained.'], modifications: ['Bend your knees.', 'Loop a strap around your feet.', 'Sit on a folded blanket.'] }),
  P({ id: 'head-to-knee', name: 'Head-to-knee forward fold', sanskrit: 'Janu sirsasana', roles: ['fold'], position: 'seated', minLevel: 'intermediate', intensity: 1, hold: 45, sides: true,
    instructions: ['Sit with one leg extended and the other foot against your inner thigh.', 'Turn your chest toward the extended leg and fold forward.', 'Rest your hands on your leg or the floor. Switch sides.'],
    cautions: ['Support your bent knee with a cushion if it hangs unsupported.'], modifications: ['Sit on a blanket.', 'Use a strap around your foot.'] }),
  P({ id: 'knee-to-chest', name: 'Knees to chest', sanskrit: 'Apanasana', roles: ['fold', 'warmup'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 40,
    instructions: ['Lie on your back and bring both knees toward your chest.', 'Hold your shins or knees and rock gently from side to side if it feels good.', 'Breathe slowly.'],
    cautions: ['Keep your neck relaxed.'], modifications: ['Hug one knee at a time.'] }),
  P({ id: 'happy-baby', name: 'Happy baby', sanskrit: 'Ananda balasana', roles: ['hip'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 45,
    instructions: ['Lie on your back and bring your knees toward your armpits.', 'Hold the outsides of your feet or your shins.', 'Let your tailbone stay heavy and rock gently if you like.'],
    cautions: ['Skip if it strains your lower back or neck.'], modifications: ['Hold the backs of your thighs.', 'Loop a strap around each foot.'] }),
  P({ id: 'reclined-hand-to-toe', name: 'Reclined leg stretch with a strap', sanskrit: 'Supta padangusthasana', roles: ['fold', 'hip'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 40, sides: true, requires: ['strap'],
    instructions: ['Lie on your back and loop a strap around the ball of your right foot.', 'Straighten your right leg toward the ceiling and keep your left leg long on the floor.', 'Keep both hips on the floor. Breathe, then switch.'],
    cautions: ['Keep a slight bend in the raised knee if the hamstring is tight.'], modifications: ['Bend the bottom knee and keep the foot on the floor.'] }),
  P({ id: 'reclined-leg-stretch', name: 'Reclined leg stretch (no strap)', roles: ['fold', 'hip'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 40, sides: true,
    instructions: ['Lie on your back. Hug your right knee toward your chest.', 'Straighten the leg toward the ceiling, holding the back of your thigh or calf.', 'Keep your other leg long or bent. Breathe, then switch.'],
    cautions: ['Keep a soft bend in the raised knee if needed.'], modifications: ['Use a towel or the legs of your trousers as a strap.'] }),
  P({ id: 'figure-four', name: 'Reclined figure four', sanskrit: 'Supta kapotasana (reclined pigeon)', roles: ['hip'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 45, sides: true,
    instructions: ['Lie on your back with your knees bent and feet flat.', 'Cross your right ankle over your left thigh and flex your right foot.', 'Thread your hands behind your left thigh and draw it toward you.', 'Breathe, then switch sides.'],
    cautions: ['Keep your foot flexed to protect your knee.'], modifications: ['Keep your lower foot on the floor.', 'Press your top knee gently away with your hand.'] }),
  P({ id: 'bound-angle', name: 'Bound angle', sanskrit: 'Baddha konasana', roles: ['hip', 'fold'], position: 'seated', minLevel: 'beginner', intensity: 1, hold: 60,
    instructions: ['Sit and bring the soles of your feet together, knees open.', 'Hold your feet or ankles and sit tall.', 'Fold forward from your hips if it feels good.'],
    cautions: ['Do not press your knees down with your hands.'], modifications: ['Sit on a blanket.', 'Put cushions or blocks under your knees.'] }),
  P({ id: 'garland', name: 'Garland squat', sanskrit: 'Malasana', roles: ['hip'], position: 'standing', minLevel: 'intermediate', intensity: 2, hold: 30, tags: ['knees', 'standing'],
    instructions: ['Stand with your feet wider than your hips and toes turned out.', 'Bend your knees and lower into a squat.', 'Bring your palms together at your chest and press your elbows gently against your knees.', 'Keep your spine long.'],
    cautions: ['Avoid deep squats if you have knee pain.'], modifications: ['Sit on a block or folded blanket.', 'Hold on to a sturdy support.'] }),
  P({ id: 'lizard', name: 'Lizard lunge', sanskrit: 'Utthan pristhasana', roles: ['hip'], position: 'kneeling', minLevel: 'regular', intensity: 2, hold: 40, sides: true, needsPadding: true, tags: ['knees', 'wrists'],
    instructions: ['From a low lunge, place both hands inside your front foot.', 'Lower your back knee if you like and sink your hips toward the floor.', 'Rest on your forearms or blocks if you can. Switch sides.'],
    cautions: ['Come out if you feel pain in your front knee or hip.'], modifications: ['Keep your hands on blocks.', 'Lower your back knee.'] }),
  P({ id: 'sleeping-pigeon', name: 'Sleeping pigeon', sanskrit: 'Eka pada rajakapotasana (supported)', roles: ['hip'], position: 'kneeling', minLevel: 'intermediate', intensity: 1, hold: 60, sides: true, needsPadding: true, tags: ['knees', 'lying-on-belly'],
    instructions: ['From hands and knees, slide your right knee forward and angle your shin across the mat.', 'Extend your left leg back and lower your hips.', 'Fold forward over your front leg and rest on your forearms or a pillow.', 'Switch sides.'],
    cautions: ['If your front knee hurts, use figure four on your back instead.'], modifications: ['Place a folded blanket or bolster under your hip.', 'Use reclined figure four.'] }),
  P({ id: 'frog', name: 'Frog pose', roles: ['hip'], position: 'allfours', minLevel: 'intermediate', intensity: 1, hold: 90, needsPadding: true, styles: ['yin'], tags: ['knees', 'wrists'],
    instructions: ['From hands and knees, slide your knees wide with your ankles in line with your knees.', 'Lower your hips back and your forearms to the floor.', 'Find a stretch in your inner thighs and stay there.'],
    cautions: ['Do not push into pain at the knees.'], modifications: ['Place a blanket under your knees.', 'Bring your knees closer together.'] }),
  P({ id: 'seated-twist', name: 'Seated twist', sanskrit: 'Ardha matsyendrasana (simple)', roles: ['twist'], position: 'seated', minLevel: 'beginner', intensity: 1, hold: 40, sides: true,
    instructions: ['Sit tall with your legs crossed or extended.', 'Place your right hand behind you and your left hand on your right knee.', 'Lengthen up, then turn your chest to the right.', 'Breathe, return to centre and switch sides.'],
    cautions: ['Twist from your middle back, not your neck. Do not force it.'], modifications: ['Do a seated twist on a chair.'] }),
  P({ id: 'supine-twist', name: 'Reclined twist', sanskrit: 'Supta matsyendrasana', roles: ['twist'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 60, sides: true,
    instructions: ['Lie on your back and hug both knees to your chest.', 'Drop your knees to the right and extend your arms out to the sides.', 'Turn your head gently to the left if it is comfortable. Breathe, then switch sides.'],
    cautions: ['Keep your shoulders reaching toward the floor.'], modifications: ['Place a pillow or cushion between your knees.', 'Keep your knees higher.'] }),
  P({ id: 'dragon', name: 'Dragon lunge', roles: ['hip'], position: 'kneeling', minLevel: 'intermediate', intensity: 1, hold: 90, sides: true, needsPadding: true, styles: ['yin'], tags: ['knees'],
    instructions: ['From a low lunge, lower your hips and let the stretch settle in your hip flexors.', 'Rest your hands on blocks or the floor.', 'Stay still and breathe. Switch sides.'],
    cautions: ['Pad your back knee well.'], modifications: ['Rest your hands on blocks.'] }),
  P({ id: 'caterpillar', name: 'Caterpillar fold', roles: ['fold'], position: 'seated', minLevel: 'beginner', intensity: 1, hold: 120, styles: ['yin'],
    instructions: ['Sit with your legs extended and knees slightly bent.', 'Let your spine round and your head hang forward, resting your hands on your legs.', 'Relax your jaw and breathe slowly.'],
    cautions: ['Keep your knees bent if the back of your legs are tight.'], modifications: ['Place a bolster or cushion on your lap and rest on it.'] }),

  // ---------- core ----------
  P({ id: 'plank', name: 'Plank', sanskrit: 'Phalakasana', roles: ['core'], position: 'allfours', minLevel: 'beginner', intensity: 3, hold: 20, tags: ['wrists'], needsPadding: true,
    instructions: ['Start on hands and knees, then step your feet back so your body is in one line.', 'Press the floor away and draw your belly in.', 'Keep your neck long. Lower your knees to come out.'],
    cautions: ['Stop if your lower back sags or your wrists hurt.'], modifications: ['Keep your knees on the floor.', 'Come onto your forearms.', 'Place your hands on a wall or chair.'] }),
  P({ id: 'forearm-plank', name: 'Forearm plank', roles: ['core'], position: 'prone', minLevel: 'intermediate', intensity: 3, hold: 20, needsPadding: true, tags: ['lying-on-belly'],
    instructions: ['Rest on your forearms with elbows under your shoulders.', 'Step your feet back into one line from head to heels.', 'Draw your belly in and keep breathing.'],
    cautions: ['Lower your knees when your form fades.'], modifications: ['Keep your knees on the floor.'] }),
  P({ id: 'side-plank', name: 'Side plank', sanskrit: 'Vasisthasana', roles: ['core', 'balance'], position: 'prone', minLevel: 'intermediate', intensity: 3, hold: 15, sides: true, needsPadding: true, tags: ['wrists', 'balance'],
    instructions: ['From plank, shift onto the outside edge of your right foot and stack your left foot on top.', 'Lift your left arm toward the ceiling and keep your hips high.', 'Lower with control and switch.'],
    cautions: ['Keep your shoulder stacked over your wrist.'], modifications: ['Lower your bottom knee to the floor.', 'Use your forearm.'] }),
  P({ id: 'boat', name: 'Boat pose', sanskrit: 'Navasana', roles: ['core'], position: 'seated', minLevel: 'intermediate', intensity: 3, hold: 20,
    instructions: ['Sit with your knees bent and feet on the floor.', 'Lean back slightly and lift your feet so your shins are parallel to the floor.', 'Keep your chest lifted. Reach your arms forward.'],
    cautions: ['Keep your spine long, not collapsed. Skip it if it hurts your lower back.'], modifications: ['Keep your feet on the floor.', 'Hold the backs of your thighs.'] }),
  P({ id: 'dead-bug', name: 'Dead bug', roles: ['core'], position: 'supine', minLevel: 'beginner', intensity: 2, hold: 30,
    instructions: ['Lie on your back with your knees over your hips and arms toward the ceiling.', 'Slowly lower your right arm overhead and your left leg toward the floor, keeping your lower back gently pressed down.', 'Return and switch sides.'],
    cautions: ['Stop the lowering where your lower back starts to lift.'], modifications: ['Move only your legs, with your hands on your belly.'] }),

  // ---------- restorative and relaxation ----------
  P({ id: 'constructive-rest', name: 'Constructive rest', roles: ['restore', 'relax'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 120,
    instructions: ['Lie on your back with your knees bent and feet flat, wider than your hips.', 'Let your knees lean in toward each other and rest your arms by your sides.', 'Close your eyes and let your breath settle.'],
    cautions: ['Use a folded blanket under your head if your chin tips up.'], modifications: ['Put a cushion under your head.', 'Extend your legs if it feels better.'] }),
  P({ id: 'side-lying-rest', name: 'Side-lying rest', roles: ['restore', 'relax'], position: 'side', minLevel: 'beginner', intensity: 1, hold: 150,
    instructions: ['Lie on your right side. Rest your head on your arm or a cushion.', 'Bend your knees slightly and place a cushion or folded blanket between them if you have one.', 'Relax your face, shoulders and belly. Breathe slowly.'],
    cautions: ['A good choice if lying flat is uncomfortable.'], modifications: ['Switch sides halfway through.'] }),
  P({ id: 'savasana', name: 'Final rest', sanskrit: 'Savasana', roles: ['relax'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 300,
    instructions: ['Lie on your back with your legs comfortably apart and your arms resting a little away from your sides, palms up.', 'Close your eyes and let your breath return to normal.', 'Release your jaw, shoulders and hands. Let the floor hold your weight.', 'To come out, deepen your breath, wiggle your fingers and toes, roll to one side and press up slowly.'],
    cautions: ['If lying flat is uncomfortable, bend your knees over a cushion or lie on your side.'], modifications: ['Place a bolster or cushion under your knees.', 'Cover yourself with a blanket.', 'Lie on your side.'] }),
  P({ id: 'legs-up-wall', name: 'Legs up the wall', sanskrit: 'Viparita karani (supported)', roles: ['restore'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 300, requires: ['wall'],
    instructions: ['Sit sideways next to a wall, then swing your legs up the wall as you lie back.', 'Rest your arms by your sides and relax your legs.', 'Stay and breathe slowly. To come out, bend your knees and roll to one side.'],
    cautions: ['Skip it if you have glaucoma, uncontrolled high blood pressure or if your doctor advised against raising your legs. Come out if your legs tingle.'], modifications: ['Move your hips a little away from the wall.', 'Place a folded blanket under your hips.'] }),
  P({ id: 'legs-on-chair', name: 'Calves on a chair', roles: ['restore'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 240, requires: ['chair'],
    instructions: ['Lie on your back and rest your calves on the seat of a chair, knees bent about 90 degrees.', 'Relax your arms by your sides and let your lower back soften.', 'Breathe slowly.'],
    cautions: ['Come out slowly by rolling to one side.'], modifications: ['Place a folded blanket under your head.'] }),
  P({ id: 'supported-child', name: 'Supported child\'s pose', roles: ['restore'], position: 'kneeling', minLevel: 'beginner', intensity: 1, hold: 240, requires: ['bolster'], needsPadding: true, tags: ['knees'],
    instructions: ['Kneel with your knees wide and a bolster lengthways between them.', 'Fold forward and rest your torso and cheek on the bolster.', 'Turn your head halfway through.'],
    cautions: ['Come out if you feel pressure in your knees.'], modifications: ['Place a blanket behind your knees.'] }),
  P({ id: 'supported-bridge', name: 'Supported bridge', roles: ['restore'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 240, requires: ['blocks'],
    instructions: ['Lie on your back with your knees bent and feet flat.', 'Lift your hips and slide a block under your sacrum, the flat bony area at the base of your spine, at a comfortable height.', 'Rest your arms by your sides and let your hips relax onto the block.', 'To come out, lift your hips slightly, slide the block away and lower down.'],
    cautions: ['Use the lowest block height first. Come out if your lower back pinches.'], modifications: ['Use a folded blanket instead of a block.'] }),
  P({ id: 'reclined-bound-angle', name: 'Supported bound angle', sanskrit: 'Supta baddha konasana', roles: ['restore'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 300, requires: ['bolster'],
    instructions: ['Place a bolster lengthways behind you and sit with your back against its end.', 'Bring the soles of your feet together and lie back on the bolster.', 'Place a cushion or blanket under each knee and rest your arms out to the sides.'],
    cautions: ['Support your knees so nothing pulls. Roll to one side to come out.'], modifications: ['Place folded blankets under your head.'] }),
  P({ id: 'supported-twist', name: 'Supported reclined twist', roles: ['restore', 'twist'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 180, sides: true, requires: ['bolster'],
    instructions: ['Lie on your back with a bolster beside your hip.', 'Bring your knees to the right and rest them on the bolster.', 'Rest your arms out to the sides. Breathe, then switch.'],
    cautions: ['Keep your shoulders reaching toward the floor.'], modifications: ['Use a stack of blankets instead.'] }),

  // ---------- chair ----------
  P({ id: 'chair-mountain', name: 'Seated mountain', roles: ['chair', 'centering'], position: 'chair', minLevel: 'beginner', intensity: 1, hold: 45, requires: ['chair'],
    instructions: ['Sit tall near the front of a sturdy chair with both feet flat on the floor.', 'Rest your hands on your thighs. Lengthen your spine.', 'Breathe slowly.'],
    cautions: ['Use a chair that will not slide. Place it against a wall if you need to.'], modifications: ['Sit back and use the chair\'s backrest.'] }),
  P({ id: 'chair-cat-cow', name: 'Seated cat and cow', roles: ['chair', 'warmup'], position: 'chair', minLevel: 'beginner', intensity: 1, hold: 60, requires: ['chair'],
    instructions: ['Sit with your hands on your knees.', 'Breathe in and lift your chest forward.', 'Breathe out and round your back, tucking your chin.', 'Repeat slowly.'],
    cautions: [GEN_CAUTION], modifications: ['Make the movement smaller.'] }),
  P({ id: 'chair-side-stretch', name: 'Seated side stretch', roles: ['chair'], position: 'chair', minLevel: 'beginner', intensity: 1, hold: 40, sides: true, requires: ['chair'],
    instructions: ['Sit tall and reach your right arm overhead.', 'Lean gently to the left, keeping both hips on the seat.', 'Breathe, then switch sides.'],
    cautions: ['Stay light and do not strain.'], modifications: ['Rest your left hand on the seat.'] }),
  P({ id: 'chair-twist', name: 'Seated twist on a chair', roles: ['chair', 'twist'], position: 'chair', minLevel: 'beginner', intensity: 1, hold: 40, sides: true, requires: ['chair'],
    instructions: ['Sit sideways on the chair or tall in the middle of it.', 'Hold the back of the chair and gently turn your chest to the right.', 'Come back to centre and switch.'],
    cautions: ['Twist from your middle back. Keep your neck comfortable.'], modifications: ['Place your hands on your thighs.'] }),
  P({ id: 'chair-forward-fold', name: 'Seated forward fold', roles: ['chair', 'fold'], position: 'chair', minLevel: 'beginner', intensity: 1, hold: 45, requires: ['chair'],
    instructions: ['Sit tall with your feet wide.', 'Fold forward from your hips and let your arms and head hang.', 'Roll up slowly.'],
    cautions: ['Come up slowly. Skip it if you feel dizzy when your head is low.'], modifications: ['Rest your hands on your thighs and fold less deeply.'] }),
  P({ id: 'chair-figure-four', name: 'Seated figure four', roles: ['chair', 'hip'], position: 'chair', minLevel: 'beginner', intensity: 1, hold: 45, sides: true, requires: ['chair'],
    instructions: ['Sit tall. Cross your right ankle over your left knee.', 'Keep your right foot flexed and lean forward slightly until you feel a stretch at the side of your hip.', 'Breathe, then switch.'],
    cautions: ['Keep your foot flexed. Do not push your knee down.'], modifications: ['Place your ankle on your shin instead of your thigh.'] }),
  P({ id: 'chair-leg-lift', name: 'Seated leg extension', roles: ['chair', 'core'], position: 'chair', minLevel: 'beginner', intensity: 1, hold: 30, sides: true, requires: ['chair'],
    instructions: ['Sit tall and straighten your right leg in front of you, heel on the floor or lifted.', 'Flex your foot and hold. Lower and switch sides.'],
    cautions: ['Keep your back long.'], modifications: ['Keep your toes on the floor.'] }),
  P({ id: 'chair-eagle-arms', name: 'Seated eagle arms', roles: ['chair'], position: 'chair', minLevel: 'beginner', intensity: 1, hold: 30, sides: true, requires: ['chair'],
    instructions: ['Sit tall and cross your right arm over your left at the elbows.', 'Lift your forearms and press your elbows forward and your shoulders down.', 'Breathe and switch.'],
    cautions: ['Stop if your shoulders feel pinched.'], modifications: ['Hug yourself with your arms.'] }),
  P({ id: 'chair-ankle-circles', name: 'Seated ankle and wrist circles', roles: ['chair', 'warmup'], position: 'chair', minLevel: 'beginner', intensity: 1, hold: 40, requires: ['chair'],
    instructions: ['Lift your right foot and circle your ankle slowly in each direction.', 'Switch feet.', 'Then circle your wrists in each direction.'],
    cautions: [GEN_CAUTION], modifications: ['Rest your foot on the floor and just point and flex.'] }),
  P({ id: 'chair-relax', name: 'Seated rest', roles: ['chair', 'relax'], position: 'chair', minLevel: 'beginner', intensity: 1, hold: 180, requires: ['chair'],
    instructions: ['Sit back in the chair with your feet flat on the floor.', 'Let your hands rest on your thighs and close your eyes.', 'Breathe slowly and let your shoulders drop.'],
    cautions: ['If you feel sleepy, stay seated until fully awake.'], modifications: ['Place a cushion behind your lower back.'] }),

  // ---------- yoga nidra (read-along cues, no audio) ----------
  P({ id: 'nidra-settle', name: 'Yoga nidra: settle and set an intention', roles: ['relax'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 180, styles: ['nidra'],
    instructions: ['Lie down comfortably on your back, or on your side if you prefer. Cover yourself if you get cold.', 'Close your eyes and take three slow breaths.', 'Silently choose a short, positive intention, for example "I am calm". Repeat it once, then let it go.'],
    cautions: ['If lying down is uncomfortable, sit in a supported chair.'], modifications: ['Place a cushion under your knees.'] }),
  P({ id: 'nidra-scan', name: 'Yoga nidra: body scan', roles: ['relax'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 480, styles: ['nidra'],
    instructions: ['Move your attention slowly through your body, one part at a time: right hand, each finger, wrist, arm, shoulder, then the left side.', 'Continue through your right foot, leg and hip, then the left.', 'Then your back, belly, chest, neck, face, jaw, eyes and forehead.', 'Simply notice each part. You do not need to change anything.'],
    cautions: ['If a body part feels uncomfortable, skip it and move on.'], modifications: ['Scan larger regions (arm, leg, torso, head) if time is short.'] }),
  P({ id: 'nidra-breath', name: 'Yoga nidra: breath counting', roles: ['relax'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 180, styles: ['nidra'],
    instructions: ['Watch your breath without changing it.', 'Count each exhale backward from ten to one. If you lose count, start again at ten.'],
    cautions: ['Keep your breathing natural.'], modifications: ['Rest your hand on your belly to feel it move.'] }),
  P({ id: 'nidra-sensation', name: 'Yoga nidra: heavy and light', roles: ['relax'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 120, styles: ['nidra'],
    instructions: ['Imagine your whole body becoming heavy, sinking into the floor.', 'Then imagine it becoming light, as if floating.', 'Notice any warmth or coolness. Let the feelings come and go.'],
    cautions: ['This is imagination only. Nothing needs to happen.'], modifications: ['Skip this part if it feels unpleasant.'] }),
  P({ id: 'nidra-imagery', name: 'Yoga nidra: calm place', roles: ['relax'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 180, styles: ['nidra'],
    instructions: ['Picture a calm, safe place, real or imagined. Notice what you see, hear and feel there.', 'Stay with the scene and let your mind soften.'],
    cautions: ['If the images become upsetting, open your eyes and focus on your breath or the room.'], modifications: ['Focus on a single colour instead of a scene.'] }),
  P({ id: 'nidra-return', name: 'Yoga nidra: come back', roles: ['relax'], position: 'supine', minLevel: 'beginner', intensity: 1, hold: 120, styles: ['nidra'],
    instructions: ['Deepen your breath and wiggle your fingers and toes.', 'Stretch if you like. Roll onto your side, rest for a moment, then sit up slowly.', 'Repeat your intention once, silently.'],
    cautions: ['Do not get up quickly. You may feel groggy for a minute.'], modifications: ['Take extra time before standing.'] }),
]

export const poseById = (id: string): YogaPose | undefined => POSES.find((p) => p.id === id)

export interface Phase {
  name: string
  /** Roles to cycle through, in order. */
  roles: Role[]
  /** Share of the session time. Phases add up to 1. */
  share: number
  /** Poses to take first, in order, when they are allowed. */
  prefer?: string[]
}

export interface YogaStyle {
  id: YogaStyleId
  name: string
  description: string
  pace: string
  /** 1 gentle, 2 moderate, 3 vigorous. Poses above this intensity are not used. */
  maxIntensity: 1 | 2 | 3
  intents: YogaIntent[]
  /** Seconds to get in and out of each pose. */
  transition: number
  /** Multiplier on the pose's typical hold. */
  holdScale: number
  /** Fixed hold in seconds by level, replacing holds. Used for yin and restorative. */
  fixedHold?: Record<TrainingLevel, number>
  /** Style only uses poses whose roles hit these, in these phases. */
  phases: Phase[]
  hot?: boolean
  caution?: string
  /** Extra notes always shown on the plan. */
  notes?: string[]
  /** Needs a prop to run at all. */
  needs?: PropId[]
  /** Level-based break: insert a child's pose rest every N main poses for beginners. */
  beginnerRests?: boolean
  recommendedMinutes: [number, number]
}

const hatha: Phase[] = [
  { name: 'Arrive', roles: ['centering', 'breath'], share: 0.08 },
  { name: 'Warm up', roles: ['warmup'], share: 0.15 },
  { name: 'Standing and balance', roles: ['standing', 'balance', 'standing'], share: 0.3 },
  { name: 'Floor poses', roles: ['backbend', 'fold', 'hip', 'twist', 'core'], share: 0.3 },
  { name: 'Final rest', roles: ['relax'], share: 0.17 },
]

export const STYLES: YogaStyle[] = [
  { id: 'hatha', name: 'Hatha', description: 'A steady, classic practice: poses held for a few breaths with time to rest between them.', pace: 'Slow to moderate', maxIntensity: 2, intents: ['moderate', 'flexibility'], transition: 15, holdScale: 1, phases: hatha, recommendedMinutes: [20, 75] },
  { id: 'vinyasa', name: 'Vinyasa', description: 'Poses linked by breath in a flowing sequence. Holds are short and the pace is steady.', pace: 'Moderate, flowing', maxIntensity: 3, intents: ['moderate', 'vigorous'], transition: 8, holdScale: 0.6, beginnerRests: true,
    phases: [
      { name: 'Arrive', roles: ['centering', 'breath'], share: 0.06 },
      { name: 'Warm up', roles: ['warmup', 'flow'], share: 0.18, prefer: ['cat-cow', 'down-dog', 'sun-salutation-a'] },
      { name: 'Flow', roles: ['flow', 'standing', 'balance', 'standing'], share: 0.4, prefer: ['sun-salutation-a', 'warrior-1', 'warrior-2', 'triangle', 'sun-salutation-b'] },
      { name: 'Floor and cool down', roles: ['backbend', 'hip', 'fold', 'twist'], share: 0.24 },
      { name: 'Final rest', roles: ['relax'], share: 0.12 },
    ], recommendedMinutes: [20, 75] },
  { id: 'ashtanga', name: 'Ashtanga-style (simplified)', description: 'Inspired by the Ashtanga system: repeated sun salutations, then standing poses and a closing sequence. This is a simplified version. The traditional series is learned with a teacher.', pace: 'Fast and demanding', maxIntensity: 3, intents: ['vigorous'], transition: 8, holdScale: 0.6, beginnerRests: true,
    notes: ['This is an Ashtanga-style session, not the traditional Primary Series. Learn that from a qualified teacher.'],
    phases: [
      { name: 'Arrive', roles: ['centering', 'breath'], share: 0.05 },
      { name: 'Sun salutations', roles: ['flow'], share: 0.25, prefer: ['sun-salutation-a', 'sun-salutation-b'] },
      { name: 'Standing sequence', roles: ['standing', 'balance'], share: 0.32, prefer: ['mountain', 'standing-forward-fold', 'triangle', 'warrior-2', 'side-angle', 'wide-leg-fold', 'warrior-1'] },
      { name: 'Seated and closing', roles: ['fold', 'twist', 'backbend', 'hip', 'core'], share: 0.24 },
      { name: 'Final rest', roles: ['relax'], share: 0.14 },
    ], recommendedMinutes: [30, 75] },
  { id: 'iyengar', name: 'Iyengar-style', description: 'Careful alignment with longer holds and props (blocks, straps, walls and chairs) to help you find each pose.', pace: 'Slow, precise', maxIntensity: 2, intents: ['moderate', 'flexibility'], transition: 20, holdScale: 1.4,
    phases: [
      { name: 'Arrive', roles: ['centering', 'breath'], share: 0.06 },
      { name: 'Standing poses', roles: ['standing', 'balance'], share: 0.38, prefer: ['mountain', 'tree-wall', 'triangle', 'warrior-2', 'wide-leg-fold'] },
      { name: 'Seated and floor', roles: ['fold', 'hip', 'twist', 'backbend'], share: 0.32, prefer: ['reclined-hand-to-toe', 'bound-angle', 'seated-forward-fold', 'bridge'] },
      { name: 'Supported rest', roles: ['restore'], share: 0.12, prefer: ['legs-up-wall', 'supported-bridge', 'constructive-rest'] },
      { name: 'Final rest', roles: ['relax'], share: 0.12 },
    ], notes: ['Props make poses safer and more accessible. If you lack a prop, a nearby pose is used and listed below.'], recommendedMinutes: [30, 90] },
  { id: 'yin', name: 'Yin', description: 'Passive floor poses held for two to four minutes to release the hips, back and legs. Muscles stay relaxed.', pace: 'Very slow', maxIntensity: 1, intents: ['flexibility', 'relaxation', 'recovery'], transition: 25, holdScale: 1,
    fixedHold: { beginner: 120, intermediate: 180, regular: 240 },
    notes: ['In yin you stay in a gentle edge of each pose. Never push into sharp pain.'],
    phases: [
      { name: 'Arrive', roles: ['centering', 'breath'], share: 0.08 },
      { name: 'Long holds', roles: ['hip', 'fold', 'backbend', 'twist'], share: 0.75, prefer: ['bound-angle', 'caterpillar', 'sphinx', 'sleeping-pigeon', 'supine-twist', 'frog', 'dragon'] },
      { name: 'Final rest', roles: ['relax'], share: 0.17 },
    ], recommendedMinutes: [30, 75] },
  { id: 'restorative', name: 'Restorative', description: 'Fully supported poses held for several minutes to settle the nervous system. Props do most of the work.', pace: 'Very slow', maxIntensity: 1, intents: ['relaxation', 'recovery', 'gentle'], transition: 30, holdScale: 1,
    fixedHold: { beginner: 240, intermediate: 300, regular: 360 },
    notes: ['Restorative yoga is gentle but still uses a lot of rest time. Wear warm clothes.'],
    phases: [
      { name: 'Arrive', roles: ['breath', 'centering'], share: 0.1 },
      { name: 'Supported poses', roles: ['restore', 'twist'], share: 0.7, prefer: ['supported-child', 'reclined-bound-angle', 'supported-bridge', 'legs-up-wall', 'legs-on-chair', 'supported-twist', 'constructive-rest', 'side-lying-rest'] },
      { name: 'Final rest', roles: ['relax'], share: 0.2 },
    ], recommendedMinutes: [20, 60] },
  { id: 'kundalini', name: 'Kundalini-inspired', description: 'Simple spinal movements, breathing practices and quiet meditation. This is a simplified, inspired session. Traditional kundalini kriyas are learned with a teacher.', pace: 'Gentle to moderate', maxIntensity: 2, intents: ['gentle', 'relaxation'], transition: 10, holdScale: 1, notes: ['This is Kundalini-inspired breath and movement, not a traditional kriya.'],
    phases: [
      { name: 'Tune in', roles: ['centering', 'breath'], share: 0.15, prefer: ['easy-seat', 'alternate-nostril'] },
      { name: 'Spinal warm-up', roles: ['warmup'], share: 0.25, prefer: ['seated-spinal-flex', 'cat-cow', 'shoulder-rolls', 'neck-release'] },
      { name: 'Breath and movement', roles: ['breath', 'core', 'backbend'], share: 0.3, prefer: ['breath-of-fire', 'humming-bee', 'bridge'] },
      { name: 'Final rest', roles: ['relax'], share: 0.3 },
    ], recommendedMinutes: [15, 60] },
  { id: 'power', name: 'Power', description: 'A vigorous, strength-building flow with longer sequences of standing poses and core work.', pace: 'Fast and strong', maxIntensity: 3, intents: ['vigorous'], transition: 8, holdScale: 0.6, beginnerRests: true,
    phases: [
      { name: 'Arrive', roles: ['centering', 'breath'], share: 0.05 },
      { name: 'Warm up', roles: ['warmup', 'flow'], share: 0.18, prefer: ['cat-cow', 'down-dog', 'sun-salutation-a'] },
      { name: 'Power flow', roles: ['flow', 'standing', 'core', 'balance'], share: 0.45, prefer: ['sun-salutation-b', 'chair-pose', 'warrior-2', 'plank', 'warrior-3'] },
      { name: 'Cool down', roles: ['hip', 'fold', 'twist'], share: 0.2 },
      { name: 'Final rest', roles: ['relax'], share: 0.12 },
    ], recommendedMinutes: [30, 75] },
  { id: 'hot', name: 'Hot yoga (Bikram-style)', description: 'Practised in a heated studio. Poses are held for shorter times with plenty of water breaks.', pace: 'Moderate', maxIntensity: 2, intents: ['moderate', 'flexibility'], transition: 15, holdScale: 0.8, hot: true,
    caution: 'Hot yoga needs a properly heated and ventilated studio run by qualified staff. Do not heat a room at home or elsewhere to practise this. Heat adds risk (dehydration, overheating, dizziness), especially with heart or blood pressure conditions, pregnancy, or heat sensitivity. Drink water, rest whenever you want, and leave the room if you feel unwell.',
    notes: ['This sequence works at ordinary room temperature. You do not need to add heat to follow it.', 'This is not the copyrighted 26-pose series. It is a similar, simplified sequence.'],
    phases: [
      { name: 'Arrive', roles: ['centering', 'breath'], share: 0.08, prefer: ['ocean-breath'] },
      { name: 'Standing series', roles: ['standing', 'balance', 'standing'], share: 0.42, prefer: ['mountain', 'standing-side-bend', 'chair-pose', 'triangle', 'tree', 'warrior-2'] },
      { name: 'Floor series', roles: ['backbend', 'fold', 'twist', 'hip'], share: 0.33 },
      { name: 'Final rest', roles: ['relax'], share: 0.17 },
    ], recommendedMinutes: [30, 75] },
  { id: 'sivananda', name: 'Sivananda-style (simplified)', description: 'Inspired by the Sivananda tradition: relaxation, breathing, sun salutations, a set of classic poses and a final rest.', pace: 'Slow to moderate', maxIntensity: 2, intents: ['moderate', 'relaxation'], transition: 15, holdScale: 1,
    notes: ['The traditional sequence includes headstand and shoulder stand. These are left out here because they carry more risk without a teacher. Safer poses are used instead.'],
    phases: [
      { name: 'Relax and breathe', roles: ['relax', 'breath'], share: 0.1, prefer: ['constructive-rest', 'three-part-breath', 'alternate-nostril'] },
      { name: 'Sun salutations', roles: ['flow'], share: 0.15, prefer: ['sun-salutation-a'] },
      { name: 'Classic poses', roles: ['backbend', 'fold', 'twist', 'standing'], share: 0.5, prefer: ['legs-up-wall', 'bridge', 'seated-forward-fold', 'cobra', 'locust', 'seated-twist', 'standing-forward-fold', 'triangle'] },
      { name: 'Final rest', roles: ['relax'], share: 0.25 },
    ], recommendedMinutes: [30, 90] },
  { id: 'chair', name: 'Chair yoga', description: 'Seated and chair-supported poses for gentle strength and flexibility. A good fit if the floor or standing is hard.', pace: 'Slow and gentle', maxIntensity: 1, intents: ['gentle', 'recovery', 'flexibility'], transition: 12, holdScale: 1, needs: ['chair'],
    phases: [
      { name: 'Arrive', roles: ['chair', 'centering'], share: 0.15, prefer: ['chair-mountain'] },
      { name: 'Gentle movement', roles: ['chair', 'warmup'], share: 0.25, prefer: ['chair-cat-cow', 'shoulder-rolls', 'chair-ankle-circles'] },
      { name: 'Stretch and strengthen', roles: ['chair', 'fold', 'twist', 'hip', 'core'], share: 0.42 },
      { name: 'Rest', roles: ['chair', 'relax'], share: 0.18, prefer: ['chair-relax'] },
    ], recommendedMinutes: [15, 45] },
  { id: 'gentle', name: 'Gentle yoga', description: 'Easy, slow poses with plenty of rest. Good for starting out, stiff days or recovery.', pace: 'Slow', maxIntensity: 1, intents: ['gentle', 'recovery', 'relaxation'], transition: 20, holdScale: 1.1, beginnerRests: false,
    phases: [
      { name: 'Arrive', roles: ['centering', 'breath'], share: 0.1 },
      { name: 'Gentle movement', roles: ['warmup'], share: 0.2 },
      { name: 'Easy poses', roles: ['standing', 'fold', 'hip', 'twist', 'balance'], share: 0.45 },
      { name: 'Final rest', roles: ['relax'], share: 0.25 },
    ], recommendedMinutes: [15, 60] },
  { id: 'nidra', name: 'Yoga nidra', description: 'A guided relaxation lying down. You read each step; no audio is included. It is a rest practice, not exercise.', pace: 'Still', maxIntensity: 1, intents: ['relaxation', 'recovery'], transition: 0, holdScale: 1,
    notes: ['This app has no audio. Read each step, or use a recording you trust.'],
    phases: [{ name: 'Guided relaxation', roles: ['relax'], share: 1 }], recommendedMinutes: [10, 45] },
]

export const styleById = (id: YogaStyleId): YogaStyle | undefined => STYLES.find((s) => s.id === id)
