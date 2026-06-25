import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonModal,
  IonNote,
  IonPage,
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import {
  addOutline,
  basketOutline,
  checkmarkOutline,
  gridOutline,
  listOutline,
  pencilOutline,
  pricetagOutline,
  removeOutline,
  trashOutline,
} from 'ionicons/icons'
import { type FormEvent, useMemo, useState } from 'react'
import { useAuth } from './auth'
import { useHousehold } from './household'

export function ShoppingList() {
  const { can } = useAuth()
  const {
    acquireShoppingItem,
    addShoppingItem,
    categories,
    inventoryItems,
    removeShoppingItem,
    setShoppingQuantity,
    shoppingItems,
    updateShoppingItem,
  } = useHousehold()
  const editable = can('edit_household')
  const [activeCategory, setActiveCategory] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [price, setPrice] = useState('')
  const [lowStockThreshold, setLowStockThreshold] = useState(0)
  const [subQuantityEnabled, setSubQuantityEnabled] = useState(false)
  const [unitLabel, setUnitLabel] = useState('')
  const [packLabel, setPackLabel] = useState('')
  const [unitsPerPack, setUnitsPerPack] = useState(1)
  const [lowStockThresholdMode, setLowStockThresholdMode] = useState<'unit' | 'pack'>('unit')
  const [formMessage, setFormMessage] = useState('')
  const [priceItemId, setPriceItemId] = useState<string | null>(null)
  const noneCategory = categories.find((category) => category.name === 'None')

  const matchedInventoryItem = useMemo(
    () =>
      inventoryItems.find(
        (item) =>
          (editingItemId &&
            item.id === shoppingItems.find((shoppingItem) => shoppingItem.id === editingItemId)?.inventoryItemId) ||
          (item.categoryId === categoryId &&
            item.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase()),
      ),
    [categoryId, editingItemId, inventoryItems, name, shoppingItems],
  )

  const visibleItems = useMemo(
    () =>
      shoppingItems
        .filter(
          (item) =>
            activeCategory === 'all' || item.categoryId === activeCategory,
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [activeCategory, shoppingItems],
  )

  const estimatedTotal = useMemo(
    () =>
      shoppingItems.reduce(
        (total, item) => total + (item.price ?? 0) * item.quantity,
        0,
      ),
    [shoppingItems],
  )
  const inventoryTotal = useMemo(
    () =>
      inventoryItems.reduce(
        (total, item) => total + (item.price ?? 0) * item.quantity,
        0,
      ),
    [inventoryItems],
  )
  const combinedTotal = inventoryTotal + estimatedTotal

  function money(value: number | null) {
    return value === null ? 'No price set' : `$${value.toFixed(2)}`
  }

  function priceValue() {
    return price.trim() === '' ? null : Number(price)
  }

  async function createItem(event: FormEvent) {
    event.preventDefault()
    if (!categoryId) return
    setFormMessage('')

    const payload = {
      name,
      categoryId,
      quantity,
      price: priceValue(),
      pendingLowStockThreshold: lowStockThreshold,
      pendingSubQuantityEnabled: subQuantityEnabled,
      pendingUnitsPerPack: unitsPerPack,
      pendingUnitLabel: unitLabel,
      pendingPackLabel: packLabel,
      pendingLowStockThresholdMode: lowStockThresholdMode,
    }
    const saved = editingItemId
      ? await updateShoppingItem({ id: editingItemId, ...payload })
      : await addShoppingItem(payload)

    if (saved) {
      resetForm()
      setShowItemForm(false)
    } else {
      setFormMessage('The shopping item could not be saved.')
    }
  }

  function resetForm() {
    setEditingItemId(null)
    setName('')
    setCategoryId(noneCategory?.id ?? '')
    setQuantity(1)
    setPrice('')
    setLowStockThreshold(0)
    setSubQuantityEnabled(false)
    setUnitLabel('')
    setPackLabel('')
    setUnitsPerPack(1)
    setLowStockThresholdMode('unit')
    setFormMessage('')
  }

  function openNewItemForm() {
    resetForm()
    setCategoryId(
      activeCategory !== 'all' ? activeCategory : (noneCategory?.id ?? ''),
    )
    setShowItemForm(true)
  }

  function openEditItemForm(item: (typeof shoppingItems)[number]) {
    const inventoryItem = inventoryItems.find(
      (candidate) => candidate.id === item.inventoryItemId,
    )

    setEditingItemId(item.id)
    setName(item.name)
    setCategoryId(item.categoryId)
    setQuantity(item.quantity)
    setPrice(item.price === null ? '' : String(item.price))
    setLowStockThreshold(
      inventoryItem?.lowStockThreshold ?? item.pendingLowStockThreshold,
    )
    setSubQuantityEnabled(
      inventoryItem?.subQuantityEnabled ?? item.pendingSubQuantityEnabled,
    )
    setUnitLabel(inventoryItem?.unitLabel ?? item.pendingUnitLabel)
    setPackLabel(inventoryItem?.packLabel ?? item.pendingPackLabel)
    setUnitsPerPack(inventoryItem?.unitsPerPack ?? item.pendingUnitsPerPack)
    setLowStockThresholdMode(
      inventoryItem?.lowStockThresholdMode ?? item.pendingLowStockThresholdMode,
    )
    setFormMessage('')
    setShowItemForm(true)
  }

  function quantityLabel(item: (typeof shoppingItems)[number]) {
    return `${item.quantity} x ${
      item.purchaseLabel || (item.purchaseUnit === 'pack' ? 'pack' : 'unit')
    }`
  }

  function itemQuantity(item: (typeof shoppingItems)[number]) {
    return Number(item.quantity)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Shopping list</IonTitle>
          {editable && (
            <IonButtons slot="end">
              <IonButton onClick={openNewItemForm}>
                <IonIcon slot="start" icon={addOutline} />
                Add item
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <main className="stock-layout">
          <section className="stock-heading">
            <div>
              <p className="eyebrow">What we need</p>
              <h1>Shopping list</h1>
              <IonText color="medium">
                Low-stock items appear here automatically. Confirm an item to
                add it back into inventory.
              </IonText>
            </div>
            <div className="stock-heading-badges">
              <IonBadge color="primary">
                {shoppingItems.length} {shoppingItems.length === 1 ? 'item' : 'items'}
              </IonBadge>
              <IonBadge color="success">
                Estimated total: ${estimatedTotal.toFixed(2)}
              </IonBadge>
              <IonBadge color="success">
                Everything total: ${combinedTotal.toFixed(2)}
              </IonBadge>
            </div>
          </section>

          <div className="category-bar" aria-label="Shopping categories">
            <button
              className={activeCategory === 'all' ? 'active' : ''}
              type="button"
              onClick={() => setActiveCategory('all')}
            >
              All
            </button>
            {categories.map((category) => (
              <button
                className={activeCategory === category.id ? 'active' : ''}
                key={category.id}
                type="button"
                onClick={() => setActiveCategory(category.id)}
              >
                {category.name}
              </button>
            ))}
          </div>

          <div className="view-toggle" aria-label="Shopping list view">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              type="button"
              onClick={() => setViewMode('grid')}
            >
              <IonIcon icon={gridOutline} /> Grid
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              type="button"
              onClick={() => setViewMode('list')}
            >
              <IonIcon icon={listOutline} /> List
            </button>
          </div>

          {visibleItems.length === 0 ? (
            <div className="empty-stock">
              <IonIcon icon={basketOutline} />
              <h2>Your list is clear</h2>
              <IonText color="medium">
                Add something you need, or let inventory add it automatically.
              </IonText>
              {editable && (
                <IonButton onClick={openNewItemForm}>
                  Add a shopping item
                </IonButton>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <section className="compact-item-list" aria-label="Shopping items">
              {visibleItems.map((item) => (
                <div className="compact-item-row" key={item.id}>
                  <span>{item.name}</span>
                  <strong>{quantityLabel(item)}</strong>
                  {editable && (
                    <IonButton
                      fill="clear"
                      aria-label={`Edit ${item.name}`}
                      onClick={() => openEditItemForm(item)}
                    >
                      <IonIcon slot="icon-only" icon={pencilOutline} />
                    </IonButton>
                  )}
                </div>
              ))}
            </section>
          ) : (
            <section className="shopping-list" aria-label="Shopping items">
              {visibleItems.map((item) => {
                const category = categories.find(
                  (candidate) => candidate.id === item.categoryId,
                )
                return (
                  <IonCard className="shopping-card" key={item.id}>
                    <IonCardContent>
                      <div className="shopping-details">
                        <div>
                          <div className="item-badges">
                            <IonBadge color="light">{category?.name}</IonBadge>
                            {item.automatic && (
                              <IonBadge color="warning">Low stock</IonBadge>
                            )}
                          </div>
                          <h2>{item.name}</h2>
                        </div>
                        {editable && (
                          <IonButton
                            fill="clear"
                            aria-label={`Edit ${item.name}`}
                            onClick={() => openEditItemForm(item)}
                          >
                            <IonIcon slot="icon-only" icon={pencilOutline} />
                          </IonButton>
                        )}
                        <IonButton
                          fill="clear"
                          size="small"
                          aria-label={`Show ${item.name} price`}
                          onClick={() =>
                            setPriceItemId(priceItemId === item.id ? null : item.id)
                          }
                        >
                          <IonIcon slot="start" icon={pricetagOutline} />
                          Price
                        </IonButton>
                        <div className="shopping-quantity-block">
                          <div className="quantity-control compact">
                            <IonButton
                              fill="outline"
                              disabled={!editable || item.quantity === 1}
                              aria-label={`Decrease ${item.name}`}
                              onClick={() =>
                                setShoppingQuantity(item.id, itemQuantity(item) - 1)
                              }
                            >
                              <IonIcon slot="icon-only" icon={removeOutline} />
                            </IonButton>
                            <IonInput
                              aria-label={`${item.name} shopping quantity`}
                              type="number"
                              min="1"
                              readonly={!editable}
                              value={item.quantity}
                              onIonChange={(event) =>
                                setShoppingQuantity(
                                  item.id,
                                  Number(event.detail.value),
                                )
                              }
                            />
                            <IonButton
                              fill="outline"
                              disabled={!editable}
                              aria-label={`Increase ${item.name}`}
                              onClick={() =>
                                setShoppingQuantity(item.id, itemQuantity(item) + 1)
                              }
                            >
                              <IonIcon slot="icon-only" icon={addOutline} />
                            </IonButton>
                          </div>
                          <IonNote>
                            {item.quantity} x{' '}
                            {item.purchaseLabel ||
                              (item.purchaseUnit === 'pack' ? 'pack' : 'unit')}
                          </IonNote>
                        </div>
                      </div>
                      {priceItemId === item.id && (
                        <section className="item-price-section">
                          <IonIcon icon={pricetagOutline} />
                          <div>
                            <strong>{money(item.price)}</strong>
                            <IonNote>
                              Estimated line total: $
                              {((item.price ?? 0) * item.quantity).toFixed(2)}
                            </IonNote>
                          </div>
                        </section>
                      )}
                      {editable && (
                        <div className="shopping-actions">
                          <IonButton
                            color="success"
                            onClick={() => acquireShoppingItem(item.id)}
                          >
                            <IonIcon slot="start" icon={checkmarkOutline} />
                            Acquired
                          </IonButton>
                          <IonButton
                            fill="clear"
                            color="medium"
                            aria-label={`Remove ${item.name}`}
                            onClick={() => removeShoppingItem(item.id)}
                          >
                            <IonIcon slot="icon-only" icon={trashOutline} />
                          </IonButton>
                        </div>
                      )}
                    </IonCardContent>
                  </IonCard>
                )
              })}
            </section>
          )}
        </main>

        <IonModal
          isOpen={showItemForm}
          onDidDismiss={() => {
            setShowItemForm(false)
            resetForm()
          }}
        >
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setShowItemForm(false)}>
                  Cancel
                </IonButton>
              </IonButtons>
              <IonTitle>{editingItemId ? 'Edit shopping item' : 'New shopping item'}</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <form className="simple-modal-form" onSubmit={createItem}>
              <IonInput
                fill="outline"
                label="Item name"
                labelPlacement="floating"
                value={name}
                onIonInput={(event) => setName(event.detail.value ?? '')}
                required
              />
              <IonSelect
                fill="outline"
                label="Category"
                labelPlacement="floating"
                value={categoryId}
                onIonChange={(event) => setCategoryId(event.detail.value)}
                required
              >
                {categories.map((category) => (
                  <IonSelectOption key={category.id} value={category.id}>
                    {category.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
              <IonInput
                fill="outline"
                label={
                  matchedInventoryItem?.subQuantityEnabled
                    ? `Number of ${matchedInventoryItem.packLabel} packs`
                    : 'Quantity to buy'
                }
                labelPlacement="floating"
                type="number"
                min="1"
                value={quantity}
                onIonInput={(event) =>
                  setQuantity(Number(event.detail.value))
                }
                required
              />
              <IonInput
                fill="outline"
                label="Price"
                labelPlacement="floating"
                type="number"
                min="0"
                step="0.01"
                value={price}
                onIonInput={(event) => setPrice(event.detail.value ?? '')}
              />
              <IonInput
                fill="outline"
                label="Low-stock limit"
                labelPlacement="floating"
                type="number"
                min="0"
                value={lowStockThreshold}
                onIonInput={(event) =>
                  setLowStockThreshold(Number(event.detail.value ?? 0))
                }
              />
              <div className="pack-toggle">
                <label>
                  <input
                    type="checkbox"
                    checked={subQuantityEnabled}
                    onChange={(event) => {
                      setSubQuantityEnabled(event.target.checked)
                      if (!event.target.checked) setLowStockThresholdMode('unit')
                    }}
                  />
                  Enable pack quantities
                </label>
                <IonNote>
                  Use this for items bought as packs but tracked as units.
                </IonNote>
              </div>
              {subQuantityEnabled && (
                <div className="pack-fields">
                  <IonInput
                    fill="outline"
                    label="Unit label"
                    labelPlacement="floating"
                    value={unitLabel}
                    onIonInput={(event) => setUnitLabel(event.detail.value ?? '')}
                    required
                  />
                  <IonInput
                    fill="outline"
                    label="Pack label"
                    labelPlacement="floating"
                    value={packLabel}
                    onIonInput={(event) => setPackLabel(event.detail.value ?? '')}
                    required
                  />
                  <IonInput
                    fill="outline"
                    label="Units per pack"
                    labelPlacement="floating"
                    type="number"
                    min="2"
                    value={unitsPerPack}
                    onIonInput={(event) =>
                      setUnitsPerPack(Number(event.detail.value ?? 1))
                    }
                    required
                  />
                  <IonSelect
                    fill="outline"
                    label="Low-stock limit is in"
                    labelPlacement="floating"
                    value={lowStockThresholdMode}
                    onIonChange={(event) =>
                      setLowStockThresholdMode(event.detail.value)
                    }
                  >
                    <IonSelectOption value="unit">Individual units</IonSelectOption>
                    <IonSelectOption value="pack">Whole packs</IonSelectOption>
                  </IonSelect>
                </div>
              )}
              <IonNote>
                {matchedInventoryItem?.subQuantityEnabled
                  ? `Each ${matchedInventoryItem.packLabel} adds ${matchedInventoryItem.unitsPerPack} ${matchedInventoryItem.unitLabel} to inventory.`
                  : 'If this item is new, confirming it as acquired will create it in inventory automatically.'}
              </IonNote>
              {formMessage && <IonNote color="danger">{formMessage}</IonNote>}
              <IonButton type="submit" expand="block">
                {editingItemId ? 'Save shopping item' : 'Add to shopping list'}
              </IonButton>
            </form>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  )
}
