/* eslint-disable react-hooks/set-state-in-effect */
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
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import {
  addOutline,
  airplaneOutline,
  bookOutline,
  compassOutline,
  heartOutline,
  locationOutline,
  openOutline,
  pencilOutline,
  sparklesOutline,
  trashOutline,
} from 'ionicons/icons'
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { api, ApiError } from './api'
import { useAuth } from './auth'

const wishlistTypes = [
  { value: 'thing', label: 'Things', icon: heartOutline },
  { value: 'activity', label: 'Activities', icon: compassOutline },
  { value: 'trip', label: 'Trips', icon: airplaneOutline },
  { value: 'place', label: 'Places to try', icon: locationOutline },
  { value: 'book', label: 'Books', icon: bookOutline },
  { value: 'other', label: 'Other', icon: sparklesOutline },
] as const

type WishlistType = (typeof wishlistTypes)[number]['value']

interface WishlistItem {
  id: number
  title: string
  type: WishlistType
  notes?: string | null
  url?: string | null
  creator?: { id: number; name: string } | null
}

const emptyForm = {
  title: '',
  type: 'thing' as WishlistType,
  notes: '',
  url: '',
}

export function Wishlist() {
  const { can } = useAuth()
  const editable = can('edit_household')
  const [items, setItems] = useState<WishlistItem[]>([])
  const [activeType, setActiveType] = useState<'all' | WishlistType>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    setItems(await api<WishlistItem[]>('/wishlist-items'))
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const visibleItems = useMemo(
    () =>
      items
        .filter((item) => activeType === 'all' || item.type === activeType)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [activeType, items],
  )

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
    setMessage('')
  }

  function openNewForm() {
    resetForm()
    if (activeType !== 'all') {
      setForm({ ...emptyForm, type: activeType })
    }
    setShowForm(true)
  }

  function openEditForm(item: WishlistItem) {
    setEditingId(item.id)
    setForm({
      title: item.title,
      type: item.type,
      notes: item.notes ?? '',
      url: item.url ?? '',
    })
    setMessage('')
    setShowForm(true)
  }

  async function saveItem(event: FormEvent) {
    event.preventDefault()
    setMessage('')

    try {
      await api(editingId ? `/wishlist-items/${editingId}` : '/wishlist-items', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify({
          ...form,
          notes: form.notes.trim() || null,
          url: form.url.trim() || null,
        }),
      })
      await refresh()
      setShowForm(false)
      resetForm()
    } catch (error) {
      setMessage(
        error instanceof ApiError ? error.message : 'Could not save this item.',
      )
    }
  }

  async function deleteItem() {
    if (!editingId) return
    if (!window.confirm(`Remove ${form.title} from the wish list?`)) return

    await api(`/wishlist-items/${editingId}`, { method: 'DELETE' })
    await refresh()
    setShowForm(false)
    resetForm()
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Wish list</IonTitle>
          {editable && (
            <IonButtons slot="end">
              <IonButton onClick={openNewForm}>
                <IonIcon slot="start" icon={addOutline} />
                Add idea
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <main className="wishlist-layout">
          <section className="stock-heading">
            <div>
              <p className="eyebrow">Things we would love</p>
              <h1>Wish list</h1>
              <IonText color="medium">
                Keep books, adventures, trips, places, and future purchases in
                one shared list.
              </IonText>
            </div>
            <IonBadge color="tertiary">
              {items.length} {items.length === 1 ? 'idea' : 'ideas'}
            </IonBadge>
          </section>

          <div className="category-bar" aria-label="Wish list types">
            <button
              className={activeType === 'all' ? 'active' : ''}
              type="button"
              onClick={() => setActiveType('all')}
            >
              All
            </button>
            {wishlistTypes.map((type) => (
              <button
                className={activeType === type.value ? 'active' : ''}
                key={type.value}
                type="button"
                onClick={() => setActiveType(type.value)}
              >
                <IonIcon icon={type.icon} /> {type.label}
              </button>
            ))}
          </div>

          {visibleItems.length === 0 ? (
            <div className="empty-stock">
              <IonIcon icon={heartOutline} />
              <h2>{items.length === 0 ? 'Start dreaming' : 'Nothing in this type yet'}</h2>
              <IonText color="medium">
                Add something you would like to get, visit, read, or do together.
              </IonText>
              {editable && <IonButton onClick={openNewForm}>Add an idea</IonButton>}
            </div>
          ) : (
            <section className="wishlist-grid" aria-label="Wish list items">
              {visibleItems.map((item) => {
                const type = wishlistTypes.find(
                  (candidate) => candidate.value === item.type,
                )!
                return (
                  <IonCard className="wishlist-card" key={item.id}>
                    <IonCardContent>
                      <div className="wishlist-card-heading">
                        <IonBadge color="light">
                          <IonIcon icon={type.icon} /> {type.label}
                        </IonBadge>
                        {editable && (
                          <IonButton
                            fill="clear"
                            aria-label={`Edit ${item.title}`}
                            onClick={() => openEditForm(item)}
                          >
                            <IonIcon slot="icon-only" icon={pencilOutline} />
                          </IonButton>
                        )}
                      </div>
                      <h2>{item.title}</h2>
                      {item.notes && <p className="wishlist-notes">{item.notes}</p>}
                      <div className="wishlist-meta">
                        {item.creator && <IonNote>Added by {item.creator.name}</IonNote>}
                        {item.url && (
                          <IonButton
                            fill="clear"
                            size="small"
                            href={item.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <IonIcon slot="start" icon={openOutline} />
                            Open link
                          </IonButton>
                        )}
                      </div>
                    </IonCardContent>
                  </IonCard>
                )
              })}
            </section>
          )}
        </main>

        <IonModal
          isOpen={showForm}
          onDidDismiss={() => {
            setShowForm(false)
            resetForm()
          }}
        >
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setShowForm(false)}>Cancel</IonButton>
              </IonButtons>
              <IonTitle>{editingId ? 'Edit idea' : 'New idea'}</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <form className="simple-modal-form" onSubmit={saveItem}>
              <IonInput
                fill="outline"
                label="What are you thinking about?"
                labelPlacement="floating"
                value={form.title}
                onIonInput={(event) =>
                  setForm((current) => ({
                    ...current,
                    title: event.detail.value ?? '',
                  }))
                }
                required
              />
              <IonSelect
                fill="outline"
                label="Type"
                labelPlacement="floating"
                value={form.type}
                onIonChange={(event) =>
                  setForm((current) => ({ ...current, type: event.detail.value }))
                }
              >
                {wishlistTypes.map((type) => (
                  <IonSelectOption key={type.value} value={type.value}>
                    {type.label}
                  </IonSelectOption>
                ))}
              </IonSelect>
              <IonTextarea
                fill="outline"
                label="Notes (optional)"
                labelPlacement="floating"
                autoGrow
                value={form.notes}
                onIonInput={(event) =>
                  setForm((current) => ({
                    ...current,
                    notes: event.detail.value ?? '',
                  }))
                }
              />
              <IonInput
                fill="outline"
                label="Website link (optional)"
                labelPlacement="floating"
                type="url"
                inputMode="url"
                placeholder="https://..."
                value={form.url}
                onIonInput={(event) =>
                  setForm((current) => ({
                    ...current,
                    url: event.detail.value ?? '',
                  }))
                }
              />
              {message && <IonNote color="danger">{message}</IonNote>}
              <IonButton type="submit" expand="block">
                {editingId ? 'Save changes' : 'Add to wish list'}
              </IonButton>
              {editingId && (
                <IonButton
                  type="button"
                  expand="block"
                  fill="outline"
                  color="danger"
                  onClick={() => void deleteItem()}
                >
                  <IonIcon slot="start" icon={trashOutline} />
                  Delete idea
                </IonButton>
              )}
            </form>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  )
}
