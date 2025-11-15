import { AppStorageV2 } from '@kit.ArkUI'
import { AppSelectedSchool, SchoolSelectionSnapshot } from '../viewmodels/School'

export const SCHOOL_SELECTION_VERSION_KEY: string = 'app_selected_school_version'

type PersistValue = string | number

interface PersistOption {
  key: string
  defaultValue: PersistValue
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
    this.selection.update(normalized)
    this.writeSnapshot(normalized)
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
      return
    }
    const snapshot: SchoolSelectionSnapshot | undefined = this.decodeSnapshot(payload)
    if (!snapshot) {
      this.clearSelection()
      return
    }
    this.selection.update(snapshot)
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

  private normalizeSnapshot(model: SchoolSelectionSnapshot): SchoolSelectionSnapshot {
    const idValue: number = typeof model.id === 'number' && model.id > 0 ? model.id : 0
    return {
      id: idValue,
      name: typeof model.name === 'string' ? model.name : '',
      province: typeof model.province === 'string' ? model.province : '',
      city: typeof model.city === 'string' ? model.city : ''
    }
  }

  private writeSnapshot(snapshot: SchoolSelectionSnapshot): void {
    AppStorage.setOrCreate(STORAGE_KEY, JSON.stringify(snapshot))
  }

  private bumpVersion(): void {
    const currentVersion: number = AppStorage.get<number>(SCHOOL_SELECTION_VERSION_KEY) ?? 0
    AppStorage.setOrCreate(SCHOOL_SELECTION_VERSION_KEY, currentVersion + 1)
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
