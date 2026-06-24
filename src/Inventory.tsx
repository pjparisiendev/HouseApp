import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCheckbox,
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
  alertCircleOutline,
  cubeOutline,
  eyeOffOutline,
  eyeOutline,
  imageOutline,
  gridOutline,
  listOutline,
  pencilOutline,
  removeOutline,
  trashOutline,
} from 'ionicons/icons'
import { type FormEvent, useMemo, useState } from 'react'
import { useAuth } from './auth'
import { type InventoryItem, useHousehold } from './household'
import { ImageGallery } from './media/ImageGallery'
import { ImageUploadField } from './media/ImageUploadField'
import type { ProcessedImage } from './media/imageProcessor'

interface PendingImage extends ProcessedImage {
  previewUrl: string
}

export function Inventory() {
  const { can } = useAuth()
  const {
    addCategory,
    addInventoryItem,
    categories,
    deleteMedia,
    deleteInventoryItem,
    inventoryItems,
    setPrimaryMedia,
    setInventoryQuantity,
    updateInventoryItem,
    uploadInventoryMedia,
  } = useHousehold()
  const editable = can('edit_household')
  const [activeCategory, setActiveCategory] = useState('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [showItemForm, setShowItemForm] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [itemName, setItemName] = useState('')
  const [itemCategory, setItemCategory] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [lowStockThreshold, setLowStockThreshold] = useState(0)
  const [subQuantityEnabled, setSubQuantityEnabled] = useState(false)
  const [unitsPerPack, setUnitsPerPack] = useState(12)
  const [unitLabel, setUnitLabel] = useState('')
  const [packLabel, setPackLabel] = useState('')
  const [lowStockThresholdMode, setLowStockThresholdMode] = useState<
    'unit' | 'pack'
  >('unit')
  const [message, setMessage] = useState('')
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([])
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  const editingItem = inventoryItems.find((item) => item.id === editingItemId)
  const noneCategory = categories.find((category) => category.name === 'None')

  const visibleItems = useMemo(
    () =>
      inventoryItems
        .filter(
          (item) =>
            activeCategory === 'all' || item.categoryId === activeCategory,
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [activeCategory, inventoryItems],
  )

  async function createCategory(event: FormEvent) {
    event.preventDefault()
    if (await addCategory(categoryName)) {
      setCategoryName('')
      setShowCategoryForm(false)
    }
  }

  function quantityLabel(item: InventoryItem) {
    return item.subQuantityEnabled
      ? `${item.quantity} ${item.unitLabel}`
      : String(item.quantity)
  }

  function itemQuantity(item: InventoryItem) {
    return Number(item.quantity)
  }

  function resetItemForm() {
    pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    setEditingItemId(null)
    setItemName('')
    setItemCategory(noneCategory?.id ?? '')
    setQuantity(1)
    setLowStockThreshold(0)
    setSubQuantityEnabled(false)
    setUnitsPerPack(12)
    setUnitLabel('')
    setPackLabel('')
    setLowStockThresholdMode('unit')
    setMessage('')
    setPendingImages([])
  }

  function openNewItemForm() {
    resetItemForm()
    setItemCategory(
      activeCategory !== 'all' ? activeCategory : (noneCategory?.id ?? ''),
    )
    setShowItemForm(true)
  }

  function openEditItemForm(item: InventoryItem) {
    setEditingItemId(item.id)
    setItemName(item.name)
    setItemCategory(item.categoryId)
    setQuantity(item.quantity)
    setLowStockThreshold(item.lowStockThreshold)
    setSubQuantityEnabled(item.subQuantityEnabled)
    setUnitsPerPack(item.unitsPerPack)
    setUnitLabel(item.unitLabel)
    setPackLabel(item.packLabel)
    setLowStockThresholdMode(item.lowStockThresholdMode)
    setMessage('')
    setShowItemForm(true)
  }

  async function saveItem(event: FormEvent) {
    event.preventDefault()
    if (!itemCategory) {
      setMessage('Choose a category before saving.')
      return
    }
    const saved = editingItemId
      ? await updateInventoryItem({
          id: editingItemId,
          name: itemName,
          categoryId: itemCategory,
          quantity,
          lowStockThreshold,
          subQuantityEnabled,
          unitsPerPack,
          unitLabel,
          packLabel,
          lowStockThresholdMode,
        })
      : await addInventoryItem({
          name: itemName,
          categoryId: itemCategory,
          quantity,
          lowStockThreshold,
          subQuantityEnabled,
          unitsPerPack,
          unitLabel,
          packLabel,
          lowStockThresholdMode,
    })
    if (!saved) {
      setMessage('The item could not be saved.')
      return
    }
    const imagesToUpload = [...pendingImages]
    for (let index = 0; index < imagesToUpload.length; index += 1) {
      if (!(await uploadInventoryMedia(saved.id, imagesToUpload[index]))) {
        setPendingImages(imagesToUpload.slice(index))
        setEditingItemId(saved.id)
        setMessage('The item was saved, but one photo could not be uploaded.')
        return
      }
      URL.revokeObjectURL(imagesToUpload[index].previewUrl)
      setPendingImages(imagesToUpload.slice(index + 1))
    }
    resetItemForm()
    setShowItemForm(false)
  }

  function addPendingImages(images: ProcessedImage[]) {
    setPendingImages((current) => [
      ...current,
      ...images.map((image) => ({
        ...image,
        previewUrl: URL.createObjectURL(image.file),
      })),
    ])
    setMessage('')
  }

  function removePendingImage(index: number) {
    setPendingImages((current) => {
      URL.revokeObjectURL(current[index].previewUrl)
      return current.filter((_, candidate) => candidate !== index)
    })
  }

  function toggleItemImage(item: InventoryItem) {
    if (expandedItemId === item.id) {
      setExpandedItemId(null)
      return
    }
    setExpandedItemId(item.id)
  }

  async function deleteItem() {
    if (!editingItemId) return
    const confirmed = window.confirm(
      `Delete ${itemName} from inventory? This cannot be undone.`,
    )
    if (!confirmed) return
    await deleteInventoryItem(editingItemId)
    resetItemForm()
    setShowItemForm(false)
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Inventory</IonTitle>
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
              <p className="eyebrow">What we have</p>
              <h1>Inventory</h1>
              <IonText color="medium">
                Adjust quantities as supplies are used or replenished.
              </IonText>
            </div>
            {!editable && <IonBadge color="medium">Read only</IonBadge>}
          </section>

          <div className="category-bar" aria-label="Inventory categories">
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
            {editable && (
              <button
                className="add-category"
                type="button"
                onClick={() => setShowCategoryForm(true)}
              >
                <IonIcon icon={addOutline} /> New category
              </button>
            )}
          </div>

          <div className="view-toggle" aria-label="Inventory view">
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
              <IonIcon icon={cubeOutline} />
              <h2>No items here yet</h2>
              <IonText color="medium">
                Add the first item to begin tracking this category.
              </IonText>
              {editable && (
                <IonButton onClick={openNewItemForm}>
                  Add an item
                </IonButton>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <section className="compact-item-list" aria-label="Inventory items">
              {visibleItems.map((item) => (
                <button
                  className="compact-item-row"
                  key={item.id}
                  type="button"
                  onClick={() => editable && openEditItemForm(item)}
                >
                  <span>{item.name}</span>
                  <strong>{quantityLabel(item)}</strong>
                </button>
              ))}
            </section>
          ) : (
            <section className="stock-grid" aria-label="Inventory items">
              {visibleItems.map((item) => {
                const category = categories.find(
                  (candidate) => candidate.id === item.categoryId,
                )
                const thresholdInUnits =
                  item.subQuantityEnabled &&
                  item.lowStockThresholdMode === 'pack'
                    ? Number(item.lowStockThreshold) * Number(item.unitsPerPack)
                    : Number(item.lowStockThreshold)
                const isLow =
                  thresholdInUnits > 0 && itemQuantity(item) < thresholdInUnits
                const fullPacks = item.subQuantityEnabled
                  ? Math.floor(itemQuantity(item) / Number(item.unitsPerPack))
                  : 0
                const remainingUnits = item.subQuantityEnabled
                  ? itemQuantity(item) % Number(item.unitsPerPack)
                  : 0
                return (
                  <IonCard
                    className={`stock-card${isLow ? ' low-stock' : ''}${expandedItemId === item.id ? ' image-expanded' : ''}`}
                    key={item.id}
                  >
                    <IonCardContent>
                      <div className="stock-card-heading">
                        <div>
                          <h2>{item.name}</h2>
                          <IonBadge className="stock-category-badge" color="light">
                            {category?.name}
                          </IonBadge>
                        </div>
                        <div className="stock-card-actions">
                          {isLow && (
                            <IonBadge color="danger">
                              <IonIcon icon={alertCircleOutline} /> Low stock
                            </IonBadge>
                          )}
                          {item.media.length > 0 && (
                            <IonButton
                              className="view-image-button"
                              fill="clear"
                              size="small"
                              aria-label={`${expandedItemId === item.id ? 'Hide' : 'View'} ${item.name} photo`}
                              onClick={() => toggleItemImage(item)}
                            >
                              <IonIcon
                                slot="start"
                                icon={
                                  expandedItemId === item.id
                                    ? eyeOffOutline
                                    : eyeOutline
                                }
                              />
                              {expandedItemId === item.id ? 'Hide' : 'View'}
                            </IonButton>
                          )}
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
                      </div>
                      {expandedItemId === item.id && (
                        <div className="stock-image-view">
                          <ImageGallery
                            media={item.media}
                            alt={`${item.name} product`}
                            editable={editable}
                            onDelete={async (mediaId) => {
                              if (!window.confirm('Delete this photo?')) return
                              await deleteMedia(mediaId)
                              if (item.media.length === 1) setExpandedItemId(null)
                            }}
                            onPrimary={setPrimaryMedia}
                          />
                        </div>
                      )}
                      {item.subQuantityEnabled && (
                        <p className="stock-quantity-summary">
                          <strong>
                            {item.quantity} {item.unitLabel}
                          </strong>
                          <span>
                            {fullPacks} × {item.packLabel} + {remainingUnits}{' '}
                            {item.unitLabel}
                          </span>
                        </p>
                      )}
                      <div className="quantity-control">
                        <IonButton
                          fill="outline"
                          aria-label={`Decrease ${item.name}`}
                          disabled={!editable || item.quantity === 0}
                          onClick={() =>
                            setInventoryQuantity(item.id, itemQuantity(item) - 1)
                          }
                        >
                          <IonIcon slot="icon-only" icon={removeOutline} />
                        </IonButton>
                        <IonInput
                          aria-label={`${item.name} quantity`}
                          type="number"
                          min="0"
                          value={item.quantity}
                          readonly={!editable}
                          onIonChange={(event) =>
                            setInventoryQuantity(
                              item.id,
                              Number(event.detail.value),
                            )
                          }
                        />
                        <IonButton
                          fill="outline"
                          aria-label={`Increase ${item.name}`}
                          disabled={!editable}
                          onClick={() =>
                            setInventoryQuantity(item.id, itemQuantity(item) + 1)
                          }
                        >
                          <IonIcon slot="icon-only" icon={addOutline} />
                        </IonButton>
                      </div>
                      {item.subQuantityEnabled && (
                        <div className="pack-quantity-control">
                          <IonButton
                            size="small"
                            fill="outline"
                            disabled={
                              !editable ||
                              itemQuantity(item) < Number(item.unitsPerPack)
                            }
                            onClick={() =>
                              setInventoryQuantity(
                                item.id,
                                itemQuantity(item) - Number(item.unitsPerPack),
                              )
                            }
                          >
                            - 1 × {item.packLabel}
                          </IonButton>
                          <IonButton
                            size="small"
                            fill="outline"
                            disabled={!editable}
                            onClick={() =>
                              setInventoryQuantity(
                                item.id,
                                itemQuantity(item) + Number(item.unitsPerPack),
                              )
                            }
                          >
                            + 1 × {item.packLabel}
                          </IonButton>
                        </div>
                      )}
                      <IonNote>
                        {item.lowStockThreshold > 0
                          ? `Shopping reminder below ${item.lowStockThreshold} ${
                              item.subQuantityEnabled
                                ? item.lowStockThresholdMode === 'pack'
                                  ? item.packLabel
                                  : item.unitLabel
                                : ''
                            }`.trim()
                          : 'No low-stock reminder'}
                      </IonNote>
                    </IonCardContent>
                  </IonCard>
                )
              })}
            </section>
          )}
        </main>

        <IonModal
          isOpen={showCategoryForm}
          onDidDismiss={() => setShowCategoryForm(false)}
        >
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setShowCategoryForm(false)}>
                  Cancel
                </IonButton>
              </IonButtons>
              <IonTitle>New category</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <form className="simple-modal-form" onSubmit={createCategory}>
              <IonInput
                fill="outline"
                label="Category name"
                labelPlacement="floating"
                value={categoryName}
                onIonInput={(event) =>
                  setCategoryName(event.detail.value ?? '')
                }
                required
              />
              <IonButton type="submit" expand="block">
                Create category
              </IonButton>
            </form>
          </IonContent>
        </IonModal>

        <IonModal
          isOpen={showItemForm}
          onDidDismiss={() => {
            setShowItemForm(false)
            resetItemForm()
          }}
        >
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setShowItemForm(false)}>
                  Cancel
                </IonButton>
              </IonButtons>
              <IonTitle>
                {editingItemId ? 'Edit inventory item' : 'New inventory item'}
              </IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <form className="simple-modal-form" onSubmit={saveItem}>
              <IonInput
                fill="outline"
                label="Item name"
                labelPlacement="floating"
                value={itemName}
                onIonInput={(event) => setItemName(event.detail.value ?? '')}
                required
              />
              <IonSelect
                fill="outline"
                label="Category"
                labelPlacement="floating"
                value={itemCategory}
                onIonChange={(event) => setItemCategory(event.detail.value)}
                required
              >
                <IonSelectOption value="" disabled>
                  Choose category
                </IonSelectOption>
                {categories.map((category) => (
                  <IonSelectOption key={category.id} value={category.id}>
                    {category.name}
                  </IonSelectOption>
                ))}
              </IonSelect>
              <section className="inventory-image-field">
                <div className="inventory-image-heading">
                  <IonIcon icon={imageOutline} />
                  <div>
                    <strong>Product gallery</strong>
                    <IonNote>Up to five optimized photos</IonNote>
                  </div>
                </div>
                {(editingItem?.media.length ?? 0) > 0 && (
                  <IonNote>
                    {editingItem?.media.length} saved photo
                    {editingItem?.media.length === 1 ? '' : 's'}. Use View on
                    the inventory card to manage them.
                  </IonNote>
                )}
                {pendingImages.length > 0 && (
                  <div className="pending-image-grid">
                    {pendingImages.map((image, index) => (
                      <div className="pending-image" key={image.previewUrl}>
                        <img src={image.previewUrl} alt={`Pending upload ${index + 1}`} />
                        <IonButton
                          type="button"
                          fill="solid"
                          color="danger"
                          size="small"
                          aria-label={`Remove pending photo ${index + 1}`}
                          onClick={() => removePendingImage(index)}
                        >
                          <IonIcon slot="icon-only" icon={trashOutline} />
                        </IonButton>
                        <IonNote>{Math.ceil(image.processedBytes / 1024)} KB</IonNote>
                      </div>
                    ))}
                  </div>
                )}
                <ImageUploadField
                  currentCount={(editingItem?.media.length ?? 0) + pendingImages.length}
                  onProcessed={addPendingImages}
                />
              </section>
              <div className="pack-toggle">
                <IonCheckbox
                  checked={subQuantityEnabled}
                  onIonChange={(event) => {
                    setSubQuantityEnabled(event.detail.checked)
                    if (!event.detail.checked) setLowStockThresholdMode('unit')
                  }}
                >
                  Enable pack quantities
                </IonCheckbox>
                <IonNote>
                  Track individual units while purchasing whole packs.
                </IonNote>
              </div>
              {subQuantityEnabled && (
                <div className="pack-fields">
                  <IonInput
                    fill="outline"
                    label="Unit label"
                    labelPlacement="floating"
                    helperText="For example: eggs"
                    value={unitLabel}
                    onIonInput={(event) =>
                      setUnitLabel(event.detail.value ?? '')
                    }
                    required
                  />
                  <IonInput
                    fill="outline"
                    label="Pack label"
                    labelPlacement="floating"
                    helperText="For example: dozen"
                    value={packLabel}
                    onIonInput={(event) =>
                      setPackLabel(event.detail.value ?? '')
                    }
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
                      setUnitsPerPack(Number(event.detail.value))
                    }
                    required
                  />
                  <IonSelect
                    fill="outline"
                    label="Low-stock limit measured in"
                    labelPlacement="floating"
                    value={lowStockThresholdMode}
                    onIonChange={(event) =>
                      setLowStockThresholdMode(event.detail.value)
                    }
                  >
                    <IonSelectOption value="unit">
                      Individual units
                    </IonSelectOption>
                    <IonSelectOption value="pack">Whole packs</IonSelectOption>
                  </IonSelect>
                </div>
              )}
              <div className="number-fields">
                <IonInput
                  fill="outline"
                  label={
                    subQuantityEnabled
                      ? `Total ${unitLabel || 'units'}`
                      : 'Starting quantity'
                  }
                  labelPlacement="floating"
                  type="number"
                  min="0"
                  value={quantity}
                  onIonInput={(event) =>
                    setQuantity(Number(event.detail.value))
                  }
                  required
                />
                <IonInput
                  fill="outline"
                  label={`Low-stock value${
                    subQuantityEnabled
                      ? ` (${lowStockThresholdMode === 'pack' ? packLabel || 'packs' : unitLabel || 'units'})`
                      : ''
                  }`}
                  labelPlacement="floating"
                  type="number"
                  min="0"
                  helperText="Adds to shopping when stock falls below this value"
                  value={lowStockThreshold}
                  onIonInput={(event) =>
                    setLowStockThreshold(Number(event.detail.value))
                  }
                  required
                />
              </div>
              {message && <IonNote color="danger">{message}</IonNote>}
              <IonButton type="submit" expand="block">
                {editingItemId ? 'Save changes' : 'Add to inventory'}
              </IonButton>
              {editingItemId && (
                <IonButton
                  type="button"
                  expand="block"
                  fill="outline"
                  color="danger"
                  onClick={() => void deleteItem()}
                >
                  <IonIcon slot="start" icon={trashOutline} />
                  Delete item
                </IonButton>
              )}
            </form>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  )
}
