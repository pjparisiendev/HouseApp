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
  bugOutline,
  checkmarkCircleOutline,
  constructOutline,
  flagOutline,
  pencilOutline,
  trashOutline,
} from 'ionicons/icons'
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { api, ApiError } from './api'
import { useAuth } from './auth'

const feedbackTypes = [
  { value: 'bug', label: 'Bug', icon: bugOutline },
  { value: 'feature', label: 'Feature', icon: flagOutline },
  { value: 'improvement', label: 'Improvement', icon: constructOutline },
  { value: 'other', label: 'Other', icon: checkmarkCircleOutline },
] as const

const feedbackStatuses = [
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'Reviewing' },
  { value: 'planned', label: 'Planned' },
  { value: 'done', label: 'Done' },
  { value: 'declined', label: 'Declined' },
] as const

const feedbackPriorities = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
] as const

type FeedbackType = (typeof feedbackTypes)[number]['value']
type FeedbackStatus = (typeof feedbackStatuses)[number]['value']
type FeedbackPriority = (typeof feedbackPriorities)[number]['value']

interface FeedbackItem {
  id: number
  type: FeedbackType
  title: string
  description: string
  status: FeedbackStatus
  priority: FeedbackPriority
  source_path?: string | null
  source_label?: string | null
  creator?: { id: number; name: string } | null
  created_at: string
}

const emptyForm = {
  type: 'bug' as FeedbackType,
  title: '',
  description: '',
  status: 'new' as FeedbackStatus,
  priority: 'normal' as FeedbackPriority,
}

export function Feedback() {
  const { can } = useAuth()
  const canManage = can('manage_feedback')
  const [items, setItems] = useState<FeedbackItem[]>([])
  const [activeType, setActiveType] = useState<'all' | FeedbackType>('all')
  const [activeStatus, setActiveStatus] = useState<'all' | FeedbackStatus>('all')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    setItems(await api<FeedbackItem[]>('/feedback-items'))
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) =>
          (activeType === 'all' || item.type === activeType) &&
          (activeStatus === 'all' || item.status === activeStatus),
      ),
    [activeStatus, activeType, items],
  )

  function resetForm() {
    setEditingId(null)
    setForm(emptyForm)
    setMessage('')
  }

  function openNewForm() {
    resetForm()
    if (activeType !== 'all') {
      setForm((current) => ({ ...current, type: activeType }))
    }
    setShowForm(true)
  }

  function openEditForm(item: FeedbackItem) {
    setEditingId(item.id)
    setForm({
      type: item.type,
      title: item.title,
      description: item.description,
      status: item.status,
      priority: item.priority,
    })
    setMessage('')
    setShowForm(true)
  }

  async function saveItem(event: FormEvent) {
    event.preventDefault()
    setMessage('')

    try {
      await api(editingId ? `/feedback-items/${editingId}` : '/feedback-items', {
        method: editingId ? 'PUT' : 'POST',
        body: JSON.stringify({
          type: form.type,
          title: form.title,
          description: form.description,
          priority: form.priority,
          ...(editingId ? { status: form.status } : {}),
        }),
      })
      await refresh()
      setShowForm(false)
      resetForm()
    } catch (error) {
      setMessage(
        error instanceof ApiError ? error.message : 'Could not save feedback.',
      )
    }
  }

  async function deleteItem() {
    if (!editingId) return
    if (!window.confirm(`Delete "${form.title}" from feedback?`)) return

    await api(`/feedback-items/${editingId}`, { method: 'DELETE' })
    await refresh()
    setShowForm(false)
    resetForm()
  }

  function typeMeta(type: FeedbackType) {
    return feedbackTypes.find((candidate) => candidate.value === type)!
  }

  function statusLabel(status: FeedbackStatus) {
    return feedbackStatuses.find((candidate) => candidate.value === status)!
      .label
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Feedback</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={openNewForm}>
              <IonIcon slot="start" icon={addOutline} />
              Add feedback
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <main className="feedback-layout">
          <section className="stock-heading">
            <div>
              <p className="eyebrow">Development notes</p>
              <h1>Feedback</h1>
              <IonText color="medium">
                Report bugs, request features, and keep track of HouseApp ideas.
              </IonText>
            </div>
            <IonBadge color="danger">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </IonBadge>
          </section>

          <div className="category-bar" aria-label="Feedback types">
            <button
              className={activeType === 'all' ? 'active' : ''}
              type="button"
              onClick={() => setActiveType('all')}
            >
              All
            </button>
            {feedbackTypes.map((type) => (
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

          <div className="category-bar" aria-label="Feedback statuses">
            <button
              className={activeStatus === 'all' ? 'active' : ''}
              type="button"
              onClick={() => setActiveStatus('all')}
            >
              All statuses
            </button>
            {feedbackStatuses.map((status) => (
              <button
                className={activeStatus === status.value ? 'active' : ''}
                key={status.value}
                type="button"
                onClick={() => setActiveStatus(status.value)}
              >
                {status.label}
              </button>
            ))}
          </div>

          {visibleItems.length === 0 ? (
            <div className="empty-stock">
              <IonIcon icon={bugOutline} />
              <h2>{items.length === 0 ? 'No feedback yet' : 'Nothing matches'}</h2>
              <IonText color="medium">
                Add a bug report or feature request when something comes to mind.
              </IonText>
              <IonButton onClick={openNewForm}>Add feedback</IonButton>
            </div>
          ) : (
            <section className="feedback-list" aria-label="Feedback items">
              {visibleItems.map((item) => {
                const type = typeMeta(item.type)
                return (
                  <IonCard className="feedback-card" key={item.id}>
                    <IonCardContent>
                      <div className="feedback-card-heading">
                        <div className="item-badges">
                          <IonBadge color="light">
                            <IonIcon icon={type.icon} /> {type.label}
                          </IonBadge>
                          <IonBadge color="medium">
                            {statusLabel(item.status)}
                          </IonBadge>
                          <IonBadge
                            color={item.priority === 'high' ? 'danger' : 'light'}
                          >
                            {item.priority} priority
                          </IonBadge>
                          {item.source_label && (
                            <IonBadge color="light">
                              From {item.source_label}
                            </IonBadge>
                          )}
                        </div>
                        {canManage && (
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
                      <p>{item.description}</p>
                      <IonNote>
                        Added by {item.creator?.name ?? 'Household member'}
                      </IonNote>
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
              <IonTitle>{editingId ? 'Edit feedback' : 'New feedback'}</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <form className="simple-modal-form" onSubmit={saveItem}>
              <IonSelect
                fill="outline"
                label="Type"
                labelPlacement="floating"
                value={form.type}
                onIonChange={(event) =>
                  setForm((current) => ({ ...current, type: event.detail.value }))
                }
              >
                {feedbackTypes.map((type) => (
                  <IonSelectOption key={type.value} value={type.value}>
                    {type.label}
                  </IonSelectOption>
                ))}
              </IonSelect>
              <IonInput
                fill="outline"
                label="Title"
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
              <IonTextarea
                fill="outline"
                label="Description"
                labelPlacement="floating"
                autoGrow
                value={form.description}
                onIonInput={(event) =>
                  setForm((current) => ({
                    ...current,
                    description: event.detail.value ?? '',
                  }))
                }
                required
              />
              <IonSelect
                fill="outline"
                label="Priority"
                labelPlacement="floating"
                value={form.priority}
                onIonChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    priority: event.detail.value,
                  }))
                }
              >
                {feedbackPriorities.map((priority) => (
                  <IonSelectOption key={priority.value} value={priority.value}>
                    {priority.label}
                  </IonSelectOption>
                ))}
              </IonSelect>
              {editingId && canManage && (
                <IonSelect
                  fill="outline"
                  label="Status"
                  labelPlacement="floating"
                  value={form.status}
                  onIonChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.detail.value,
                    }))
                  }
                >
                  {feedbackStatuses.map((status) => (
                    <IonSelectOption key={status.value} value={status.value}>
                      {status.label}
                    </IonSelectOption>
                  ))}
                </IonSelect>
              )}
              {message && <IonNote color="danger">{message}</IonNote>}
              <IonButton type="submit" expand="block">
                {editingId ? 'Save feedback' : 'Submit feedback'}
              </IonButton>
              {editingId && canManage && (
                <IonButton
                  type="button"
                  expand="block"
                  fill="outline"
                  color="danger"
                  onClick={() => void deleteItem()}
                >
                  <IonIcon slot="start" icon={trashOutline} />
                  Delete feedback
                </IonButton>
              )}
            </form>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  )
}
