type ArkUIPersistPrimitive = string | number | boolean

interface ArkUIPersistOption {
  key: string
  defaultValue: ArkUIPersistPrimitive
}

interface ArkUIAppStorage {
  setOrCreate<T extends ArkUIPersistPrimitive>(key: string, value: T): void
  get<T extends ArkUIPersistPrimitive>(key: string): T | undefined
}

interface ArkUIPersistentStorage {
  persistProps(options: ArkUIPersistOption[]): void
}

declare const AppStorage: ArkUIAppStorage
declare const PersistentStorage: ArkUIPersistentStorage
