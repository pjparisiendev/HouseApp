/* eslint-disable react-hooks/set-state-in-effect, react-refresh/only-export-components */
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import { api } from './api'
import { useAuth } from './auth'
import type { ProcessedImage } from './media/imageProcessor'
import {
  makeMediaPrimary,
  mapMedia,
  type MediaDto,
  type MediaItem,
  removeMedia,
  uploadProcessedImage,
} from './media/mediaApi'

export interface InventoryCategory {
  id: string
  name: string
}

export interface InventoryItem {
  id: string
  name: string
  categoryId: string
  quantity: number
  lowStockThreshold: number
  subQuantityEnabled: boolean
  unitsPerPack: number
  unitLabel: string
  packLabel: string
  lowStockThresholdMode: 'unit' | 'pack'
  media: MediaItem[]
}

export interface ShoppingItem {
  id: string
  name: string
  categoryId: string
  quantity: number
  inventoryItemId?: string
  automatic: boolean
  purchaseUnit: 'unit' | 'pack'
  unitsPerPurchase: number
  purchaseLabel: string
}

interface CategoryDto {
  id: number
  name: string
}

interface InventoryItemDto {
  id: number
  name: string
  inventory_category_id: number
  quantity: number
  low_stock_threshold: number
  sub_quantity_enabled: boolean
  units_per_pack: number
  unit_label?: string | null
  pack_label?: string | null
  low_stock_threshold_mode: 'unit' | 'pack'
  media: MediaDto[]
}

interface ShoppingItemDto {
  id: number
  name: string
  inventory_category_id: number
  inventory_item_id?: number | null
  quantity: number
  automatic: boolean
  purchase_unit: 'unit' | 'pack'
  units_per_purchase: number
  purchase_label?: string | null
}

function mapCategory(category: CategoryDto): InventoryCategory {
  return { id: String(category.id), name: category.name }
}

function mapInventoryItem(item: InventoryItemDto): InventoryItem {
  return {
    id: String(item.id),
    name: item.name,
    categoryId: String(item.inventory_category_id),
    quantity: Number(item.quantity),
    lowStockThreshold: Number(item.low_stock_threshold),
    subQuantityEnabled: item.sub_quantity_enabled,
    unitsPerPack: Number(item.units_per_pack),
    unitLabel: item.unit_label ?? '',
    packLabel: item.pack_label ?? '',
    lowStockThresholdMode: item.low_stock_threshold_mode,
    media: item.media.map(mapMedia),
  }
}

function mapShoppingItem(item: ShoppingItemDto): ShoppingItem {
  return {
    id: String(item.id),
    name: item.name,
    categoryId: String(item.inventory_category_id),
    quantity: Number(item.quantity),
    inventoryItemId: item.inventory_item_id
      ? String(item.inventory_item_id)
      : undefined,
    automatic: item.automatic,
    purchaseUnit: item.purchase_unit,
    unitsPerPurchase: Number(item.units_per_purchase),
    purchaseLabel: item.purchase_label ?? '',
  }
}

interface HouseholdContextValue {
  categories: InventoryCategory[]
  inventoryItems: InventoryItem[]
  shoppingItems: ShoppingItem[]
  addCategory: (name: string) => Promise<boolean>
  addInventoryItem: (item: Omit<InventoryItem, 'id' | 'media'>) => Promise<InventoryItem | null>
  updateInventoryItem: (item: Omit<InventoryItem, 'media'>) => Promise<InventoryItem | null>
  deleteInventoryItem: (itemId: string) => Promise<void>
  uploadInventoryMedia: (itemId: string, image: ProcessedImage) => Promise<boolean>
  deleteMedia: (mediaId: string) => Promise<void>
  setPrimaryMedia: (mediaId: string) => Promise<void>
  setInventoryQuantity: (itemId: string, quantity: number) => Promise<void>
  addShoppingItem: (
    item: Pick<ShoppingItem, 'name' | 'categoryId' | 'quantity'>,
  ) => Promise<boolean>
  setShoppingQuantity: (itemId: string, quantity: number) => Promise<void>
  removeShoppingItem: (itemId: string) => Promise<void>
  acquireShoppingItem: (itemId: string) => Promise<void>
}

const HouseholdContext = createContext<HouseholdContextValue | null>(null)

export function HouseholdProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth()
  const [categories, setCategories] = useState<InventoryCategory[]>([])
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([])
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([])

  const refreshHousehold = useCallback(async () => {
    const [categoryData, inventoryData, shoppingData] = await Promise.all([
      api<CategoryDto[]>('/categories'),
      api<InventoryItemDto[]>('/inventory-items'),
      api<ShoppingItemDto[]>('/shopping-items'),
    ])
    setCategories(categoryData.map(mapCategory))
    setInventoryItems(inventoryData.map(mapInventoryItem))
    setShoppingItems(shoppingData.map(mapShoppingItem))
  }, [])

  useEffect(() => {
    if (currentUser) void refreshHousehold()
    else {
      setCategories([])
      setInventoryItems([])
      setShoppingItems([])
    }
  }, [currentUser, refreshHousehold])

  async function addCategory(name: string) {
    try {
      await api('/categories', {
        method: 'POST',
        body: JSON.stringify({ name }),
      })
      await refreshHousehold()
      return true
    } catch {
      return false
    }
  }

  async function addInventoryItem(item: Omit<InventoryItem, 'id' | 'media'>) {
    try {
      const created = await api<InventoryItemDto>('/inventory-items', {
        method: 'POST',
        body: JSON.stringify({
          name: item.name,
          inventory_category_id: item.categoryId,
          quantity: item.quantity,
          low_stock_threshold: item.lowStockThreshold,
          sub_quantity_enabled: item.subQuantityEnabled,
          units_per_pack: item.unitsPerPack,
          unit_label: item.unitLabel,
          pack_label: item.packLabel,
          low_stock_threshold_mode: item.lowStockThresholdMode,
        }),
      })
      await refreshHousehold()
      return mapInventoryItem(created)
    } catch {
      return null
    }
  }

  async function updateInventoryItem(item: Omit<InventoryItem, 'media'>) {
    try {
      const updated = await api<InventoryItemDto>(`/inventory-items/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: item.name,
          inventory_category_id: item.categoryId,
          quantity: item.quantity,
          low_stock_threshold: item.lowStockThreshold,
          sub_quantity_enabled: item.subQuantityEnabled,
          units_per_pack: item.unitsPerPack,
          unit_label: item.unitLabel,
          pack_label: item.packLabel,
          low_stock_threshold_mode: item.lowStockThresholdMode,
        }),
      })
      await refreshHousehold()
      return mapInventoryItem(updated)
    } catch {
      return null
    }
  }

  async function deleteInventoryItem(itemId: string) {
    await api(`/inventory-items/${itemId}`, { method: 'DELETE' })
    await refreshHousehold()
  }

  async function uploadInventoryMedia(itemId: string, image: ProcessedImage) {
    try {
      await uploadProcessedImage(`/inventory-items/${itemId}/media`, image)
      await refreshHousehold()
      return true
    } catch {
      return false
    }
  }

  async function deleteMedia(mediaId: string) {
    await removeMedia(mediaId)
    await refreshHousehold()
  }

  async function setPrimaryMedia(mediaId: string) {
    await makeMediaPrimary(mediaId)
    await refreshHousehold()
  }

  async function setInventoryQuantity(itemId: string, quantity: number) {
    const item = inventoryItems.find((candidate) => candidate.id === itemId)
    if (!item) return
    await updateInventoryItem({ ...item, quantity: Math.max(0, Number(quantity)) })
  }

  async function addShoppingItem(
    item: Pick<ShoppingItem, 'name' | 'categoryId' | 'quantity'>,
  ) {
    try {
      await api('/shopping-items', {
        method: 'POST',
        body: JSON.stringify({
          name: item.name,
          inventory_category_id: item.categoryId,
          quantity: item.quantity,
        }),
      })
      await refreshHousehold()
      return true
    } catch {
      return false
    }
  }

  async function setShoppingQuantity(itemId: string, quantity: number) {
    await api(`/shopping-items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity: Math.max(1, Number(quantity)) }),
    })
    await refreshHousehold()
  }

  async function removeShoppingItem(itemId: string) {
    await api(`/shopping-items/${itemId}`, { method: 'DELETE' })
    await refreshHousehold()
  }

  async function acquireShoppingItem(itemId: string) {
    await api(`/shopping-items/${itemId}/acquire`, { method: 'POST' })
    await refreshHousehold()
  }

  return (
    <HouseholdContext.Provider
      value={{
        categories,
        inventoryItems,
        shoppingItems,
        addCategory,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        uploadInventoryMedia,
        deleteMedia,
        setPrimaryMedia,
        setInventoryQuantity,
        addShoppingItem,
        setShoppingQuantity,
        removeShoppingItem,
        acquireShoppingItem,
      }}
    >
      {children}
    </HouseholdContext.Provider>
  )
}

export function useHousehold() {
  const context = useContext(HouseholdContext)
  if (!context) {
    throw new Error('useHousehold must be used inside HouseholdProvider')
  }
  return context
}
