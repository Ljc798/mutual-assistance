import { AppStorageV2 } from '@kit.ArkUI'
import { AppSelectedSchool, SchoolSelectionSnapshot } from '../viewmodels/School'

export const SCHOOL_SELECTION_VERSION_KEY: string = 'app_selected_school_version'

type PersistValue = string | number

interface PersistOption {
  key: string
  defaultValue: PersistValue
}

interface SelectionLogView {
  prevId: number
  prevName: string
  nextId: number
  nextName: string
  changed: boolean
}

interface VersionLogView {
  action: string
  version: number
}

interface RestoreLogView {
  loaded: boolean
  id: number
  name: string
}

interface SchoolSelectionRaw {
  id?: number | string
  name?: string
  province?: string
  city?: string
}

const STORAGE_KEY: string = 'app_selected_school'
const STORAGE_OPTIONS: PersistOption[] = [
  { key: STORAGE_KEY, defaultValue: '' },
  { key: SCHOOL_SELECTION_VERSION_KEY, defaultValue: 0 }
]

export class SchoolPersistenceManager {
  private isReady: boolean = false
  private readonly selection: AppSelectedSchool = AppStorageV2.connect(AppSelectedSchool, () => new AppSelectedSchool())!

  initialize(): void {
    this.ensurePersistentConfig()
    this.restoreSelection()
  }

  persistSelection(model: SchoolSelectionSnapshot): void {
    this.ensurePersistentConfig()
    const normalized: SchoolSelectionSnapshot = this.normalizeSnapshot(model)
    if (normalized.id <= 0) {
      this.clearSelection()
      return
    }
    const hasChanged: boolean = !this.isSameSelection(normalized)
    const beforeLog: SelectionLogView = {
      prevId: this.selection.id,
      prevName: this.selection.name,
      nextId: normalized.id,
      nextName: normalized.name,
      changed: hasChanged
    }
    console.info('SchoolPersist.before', JSON.stringify(beforeLog))
    this.selection.update(normalized)
    this.writeSnapshot(normalized)
    console.info('SchoolPersist.write', JSON.stringify({ id: normalized.id, name: normalized.name }))
    if (hasChanged) {
      this.bumpVersion()
    }
  }

  clearSelection(): void {
    this.ensurePersistentConfig()
    const shouldNotify: boolean = this.hasSelection()
    this.selection.reset()
    AppStorage.setOrCreate(STORAGE_KEY, '')
    if (shouldNotify) {
      this.bumpVersion()
    }
    console.info('SchoolPersist.clear', JSON.stringify({ cleared: true }))
  }

  getSelection(): SchoolSelectionSnapshot {
    return {
      id: this.selection.id,
      name: this.selection.name,
      province: this.selection.province,
      city: this.selection.city
    }
  }

  private ensurePersistentConfig(): void {
    if (this.isReady) {
      return
    }
    PersistentStorage.persistProps(STORAGE_OPTIONS)
    const versionValue: number | undefined = AppStorage.get<number>(SCHOOL_SELECTION_VERSION_KEY)
    if (versionValue === undefined) {
      AppStorage.setOrCreate(SCHOOL_SELECTION_VERSION_KEY, 0)
    }
    this.isReady = true
  }

  private restoreSelection(): void {
    const payload: string = AppStorage.get<string>(STORAGE_KEY) ?? ''
    if (!payload) {
      this.selection.reset()
      const log: RestoreLogView = { loaded: false, id: 0, name: '' }
      console.info('SchoolPersist.restore', JSON.stringify(log))
      return
    }
    const snapshot: SchoolSelectionSnapshot | undefined = this.decodeSnapshot(payload)
    if (!snapshot) {
      this.clearSelection()
      return
    }
    this.selection.update(snapshot)
    const log: RestoreLogView = { loaded: true, id: snapshot.id, name: snapshot.name }
    console.info('SchoolPersist.restore', JSON.stringify(log))
  }

  private decodeSnapshot(payload: string): SchoolSelectionSnapshot | undefined {
    try {
      const parsed = JSON.parse(payload) as Partial<SchoolSelectionSnapshot>
      if (typeof parsed.id !== 'number' || parsed.id <= 0) {
        return undefined
      }
      if (typeof parsed.name !== 'string' || parsed.name.length === 0) {
        return undefined
      }
      return this.normalizeSnapshot({
        id: parsed.id,
        name: parsed.name,
        province: parsed.province ?? '',
        city: parsed.city ?? ''
      })
    } catch (error) {
      console.error('Failed to decode school snapshot', error.message)
      return undefined
    }
  }

  private normalizeSnapshot(model: SchoolSelectionSnapshot | SchoolSelectionRaw): SchoolSelectionSnapshot {
    let idInput: number | string | undefined = undefined
    const raw = model as SchoolSelectionRaw
    if (raw && raw.id !== undefined) {
      idInput = raw.id
    } else {
      idInput = (model as SchoolSelectionSnapshot).id
    }
    let idValue: number = 0
    if (typeof idInput === 'number') { idValue = idInput }
    else if (typeof idInput === 'string') {
      const n: number = Number(idInput)
      idValue = Number.isFinite(n) ? n : 0
    }
    const nameValue: string = typeof raw.name === 'string' ? raw.name : (typeof (model as SchoolSelectionSnapshot).name === 'string' ? (model as SchoolSelectionSnapshot).name : '')
    const provinceValue: string = typeof raw.province === 'string' ? raw.province : (typeof (model as SchoolSelectionSnapshot).province === 'string' ? (model as SchoolSelectionSnapshot).province : '')
    const cityValue: string = typeof raw.city === 'string' ? raw.city : (typeof (model as SchoolSelectionSnapshot).city === 'string' ? (model as SchoolSelectionSnapshot).city : '')
    return { id: idValue > 0 ? idValue : 0, name: nameValue, province: provinceValue, city: cityValue }
  }

  private writeSnapshot(snapshot: SchoolSelectionSnapshot): void {
    AppStorage.setOrCreate(STORAGE_KEY, JSON.stringify(snapshot))
  }

  private bumpVersion(): void {
    const currentVersion: number = AppStorage.get<number>(SCHOOL_SELECTION_VERSION_KEY) ?? 0
    AppStorage.setOrCreate(SCHOOL_SELECTION_VERSION_KEY, currentVersion + 1)
    const vLog: VersionLogView = { action: 'bump', version: currentVersion + 1 }
    console.info('SchoolPersist.version', JSON.stringify(vLog))
  }

  private isSameSelection(snapshot: SchoolSelectionSnapshot): boolean {
    return this.selection.id === snapshot.id &&
      this.selection.name === snapshot.name &&
      this.selection.province === snapshot.province &&
      this.selection.city === snapshot.city
  }

  private hasSelection(): boolean {
    return this.selection.id > 0 && this.selection.name.length > 0
  }
}

export const schoolPersistence: SchoolPersistenceManager = new SchoolPersistenceManager()
