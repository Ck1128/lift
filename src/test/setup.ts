import 'fake-indexeddb/auto'
import '@testing-library/jest-dom/vitest'
import { configure } from '@testing-library/react'

// The UI tests talk to a real (fake) IndexedDB, so give async lookups more room on a busy machine.
configure({ asyncUtilTimeout: 5000 })
