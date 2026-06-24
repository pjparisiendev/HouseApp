import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonModal,
  IonNote,
  IonSelect,
  IonSelectOption,
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { bugOutline } from 'ionicons/icons'
import { type FormEvent, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api, ApiError } from './api'
import { useAuth } from './auth'

const feedbackTypes = [
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature' },
  { value: 'improvement', label: 'Improvement' },
  { value: 'other', label: 'Other' },
] as const

const feedbackPriorities = [
  { value: 'low', label: 'Low' },
  { value: 'normal', label: 'Normal' },
  { value: 'high', label: 'High' },
] as const

const sourceLabels: Record<string, string> = {
  '/home': 'Home',
  '/calendar': 'Calendar',
  '/inventory': 'Inventory',
  '/shopping': 'Shopping list',
  '/wishlist': 'Wish list',
  '/feedback': 'Feedback',
  '/profile': 'Profile',
  '/admin/users': 'Users',
}

const emptyForm = {
  type: 'bug',
  title: '',
  description: '',
  priority: 'normal',
}

export function FeedbackBubble() {
  const { currentUser } = useAuth()
  const location = useLocation()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [message, setMessage] = useState('')

  const sourcePath = location.pathname
  const sourceLabel = useMemo(
    () => sourceLabels[sourcePath] ?? sourcePath,
    [sourcePath],
  )

  if (!currentUser || sourcePath === '/login') return null

  function resetForm() {
    setForm(emptyForm)
    setMessage('')
  }

  async function submitFeedback(event: FormEvent) {
    event.preventDefault()
    setMessage('')

    try {
      await api('/feedback-items', {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          source_path: sourcePath,
          source_label: sourceLabel,
        }),
      })
      resetForm()
      setShowForm(false)
    } catch (error) {
      setMessage(
        error instanceof ApiError ? error.message : 'Could not send feedback.',
      )
    }
  }

  return (
    <>
      <IonButton
        className="feedback-bubble"
        aria-label="Send feedback"
        onClick={() => setShowForm(true)}
      >
        <IonIcon slot="icon-only" icon={bugOutline} />
      </IonButton>

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
            <IonTitle>Quick feedback</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent>
          <form className="simple-modal-form" onSubmit={submitFeedback}>
            <IonNote>From {sourceLabel}</IonNote>
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
            {message && <IonNote color="danger">{message}</IonNote>}
            <IonButton type="submit" expand="block">
              Send feedback
            </IonButton>
          </form>
        </IonContent>
      </IonModal>
    </>
  )
}
