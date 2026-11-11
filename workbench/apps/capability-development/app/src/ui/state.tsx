/**
 * React binding to the application session.
 *
 * This file subscribes to the session and derives read models. It contains no domain rules: a
 * different presentation would replace this file and nothing below it, which is the point of
 * keeping the queue and the commands outside React.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { ContentRegistry } from '~/content/registry'
import { createContentRegistry } from '~/content/index'
import { createDemoUserData } from '~/content/demo'
import { randomIdFactory, systemClock } from '~/domain/ids'
import { AppSession, type SessionState } from '~/application/session'
import type { Command } from '~/application/session'
import { capabilityRows, deriveViewModels, derivePresentationModel, type CapabilityRow, type PresentationModel, type ViewModels } from '~/application/queries'
import type { ApplyResult } from '~/application/results'
import { createIndexedDbStore } from '~/storage/indexeddb'
import type { Namespace, RecordStore } from '~/storage/types'
import type { AiProvider } from '~/ai/types'
import { createFakeProvider } from '~/ai/fake-provider'

const NAMESPACE_KEY = 'skilling-me-softly:namespace'

export interface AppContextValue {
  session: AppSession
  state: SessionState
  content: ContentRegistry
  models: ViewModels
  capabilities: CapabilityRow[]
  presentation: PresentationModel
  aiProvider: AiProvider
  run<T>(command: Command<T>): Promise<ApplyResult<T>>
  switchNamespace(ns: Namespace): void
}

const AppContext = createContext<AppContextValue | null>(null)

export interface AppProviderProps {
  children: ReactNode
  /** Injected by tests. Defaults to the IndexedDB store. */
  store?: RecordStore
  content?: ContentRegistry
  aiProvider?: AiProvider
}

function rememberNamespace() {
  return {
    get(): Namespace | null {
      try {
        return window.localStorage.getItem(NAMESPACE_KEY) === 'demo' ? 'demo' : 'personal'
      } catch {
        return null
      }
    },
    set(ns: Namespace): void {
      try {
        window.localStorage.setItem(NAMESPACE_KEY, ns)
      } catch {
        // Remembering the choice is not critical.
      }
    },
  }
}

export function AppProvider({ children, store, content, aiProvider }: AppProviderProps) {
  const registry = useMemo(() => content ?? createContentRegistry(), [content])
  const provider = useMemo(() => aiProvider ?? createFakeProvider(), [aiProvider])
  // A lazy useState initialiser, not a ref: the session must be created exactly once and is read
  // during render, which is what refs are not for.
  const [session] = useState(
    () =>
      new AppSession({
        store: store ?? createIndexedDbStore(),
        content: registry,
        clock: systemClock(),
        newId: randomIdFactory(),
        createDemoData: createDemoUserData,
        rememberNamespace: rememberNamespace(),
      }),
  )
  const [state, setState] = useState<SessionState>(() => session.getState())

  useEffect(() => {
    const unsubscribe = session.subscribe(setState)
    void session.start()
    return () => {
      unsubscribe()
    }
  }, [session])

  const models = useMemo(() => deriveViewModels(state.data, registry), [state.data, registry])
  const capabilities = useMemo(() => capabilityRows(models, registry), [models, registry])
  const presentation = useMemo(() => derivePresentationModel(state.data, models), [state.data, models])

  const run = useCallback(<T,>(command: Command<T>) => session.run(command), [session])
  const switchNamespace = useCallback((ns: Namespace) => void session.switchNamespace(ns), [session])

  const value: AppContextValue = {
    session,
    state,
    content: registry,
    models,
    capabilities,
    presentation,
    aiProvider: provider,
    run,
    switchNamespace,
  }
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext)
  if (!context) throw new Error('useApp must be used inside AppProvider')
  return context
}
