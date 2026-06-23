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
  } = useHousehold()
  const editable = can('edit_household')
  const [activeCategory, setActiveCategory] = useState('all')
  const [showItemForm, setShowItemForm] = useState(false)
  const [name, setName] = useState('')
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '')
  const [quantity, setQuantity] = useState(1)

  const matchedInventoryItem = useMemo(
    () =>
      inventoryItems.find(
        (item) =>
          item.categoryId === categoryId &&
          item.name.toLocaleLowerCase() === name.trim().toLocaleLowerCase(),
      ),
    [categoryId, inventoryItems, name],
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

  async function createItem(event: FormEvent) {
    event.preventDefault()
    if (await addShoppingItem({ name, categoryId, quantity })) {
      setName('')
      setQuantity(1)
      setShowItemForm(false)
    }
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
              <IonButton onClick={() => setShowItemForm(true)}>
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
            <IonBadge color="primary">
              {shoppingItems.length} {shoppingItems.length === 1 ? 'item' : 'items'}
            </IonBadge>
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

          {visibleItems.length === 0 ? (
            <div className="empty-stock">
              <IonIcon icon={basketOutline} />
              <h2>Your list is clear</h2>
              <IonText color="medium">
                Add something you need, or let inventory add it automatically.
              </IonText>
              {editable && (
                <IonButton onClick={() => setShowItemForm(true)}>
                  Add a shopping item
                </IonButton>
              )}
            </div>
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
                        <div className="shopping-quantity-block">
                          <div className="quantity-control compact">
                            <IonButton
                              fill="outline"
                              disabled={!editable || item.quantity === 1}
                              aria-label={`Decrease ${item.name}`}
                              onClick={() =>
                                setShoppingQuantity(item.id, item.quantity - 1)
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
                                setShoppingQuantity(item.id, item.quantity + 1)
                              }
                            >
                              <IonIcon slot="icon-only" icon={addOutline} />
                            </IonButton>
                          </div>
                          <IonNote>
                            {item.quantity} ×{' '}
                            {item.purchaseLabel ||
                              (item.purchaseUnit === 'pack' ? 'pack' : 'unit')}
                          </IonNote>
                        </div>
                      </div>
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
          onDidDismiss={() => setShowItemForm(false)}
        >
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setShowItemForm(false)}>
                  Cancel
                </IonButton>
              </IonButtons>
              <IonTitle>New shopping item</IonTitle>
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
              <IonNote>
                {matchedInventoryItem?.subQuantityEnabled
                  ? `Each ${matchedInventoryItem.packLabel} adds ${matchedInventoryItem.unitsPerPack} ${matchedInventoryItem.unitLabel} to inventory.`
                  : 'If this item is new, confirming it as acquired will create it in inventory automatically.'}
              </IonNote>
              <IonButton type="submit" expand="block">
                Add to shopping list
              </IonButton>
            </form>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  )
}
