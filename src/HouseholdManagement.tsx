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
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { trashOutline } from 'ionicons/icons'
import { type FormEvent, useEffect, useState } from 'react'
import { api } from './api'

interface Household {
  id: number
  name: string
  created_at: string
  users_count: number
}

export function HouseholdManagement() {
  const [households, setHouseholds] = useState<Household[]>([])
  const [name, setName] = useState('')
  const [adminName, setAdminName] = useState('')
  const [adminUsername, setAdminUsername] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [message, setMessage] = useState('')

  async function loadHouseholds() {
    setHouseholds(await api<Household[]>('/households'))
  }

  useEffect(() => {
    void loadHouseholds()
  }, [])

  async function createHousehold(event: FormEvent) {
    event.preventDefault()
    setMessage('')

    try {
      await api('/households', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          admin_name: adminName.trim(),
          admin_username: adminUsername.trim(),
          admin_password: adminPassword,
        }),
      })
      setName('')
      setAdminName('')
      setAdminUsername('')
      setAdminPassword('')
      setMessage('Household created.')
      await loadHouseholds()
    } catch {
      setMessage('The household could not be created.')
    }
  }

  async function deleteHousehold(household: Household) {
    if (
      !window.confirm(
        `Delete ${household.name}? This removes its users and private household data.`,
      )
    ) {
      return
    }

    try {
      await api(`/households/${household.id}`, { method: 'DELETE' })
      setHouseholds((current) =>
        current.filter((item) => item.id !== household.id),
      )
      setMessage(`${household.name} was deleted.`)
    } catch {
      setMessage('The household could not be deleted.')
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Households</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <main className="admin-layout">
          <section>
            <p className="eyebrow">Platform access</p>
            <h1>Households</h1>
            <IonText color="medium">
              Create household shells and first users without opening their
              private app data.
            </IonText>
          </section>

          <IonCard className="admin-card">
            <IonCardContent>
              <h2>Create a household</h2>
              <form className="user-form" onSubmit={createHousehold}>
                <IonInput
                  fill="outline"
                  label="Household name"
                  labelPlacement="floating"
                  value={name}
                  onIonInput={(event) => setName(event.detail.value ?? '')}
                  required
                />
                <IonInput
                  fill="outline"
                  label="First user name"
                  labelPlacement="floating"
                  value={adminName}
                  onIonInput={(event) => setAdminName(event.detail.value ?? '')}
                  required
                />
                <IonInput
                  fill="outline"
                  label="Username"
                  labelPlacement="floating"
                  value={adminUsername}
                  onIonInput={(event) =>
                    setAdminUsername(event.detail.value ?? '')
                  }
                  required
                />
                <IonInput
                  fill="outline"
                  label="Initial password"
                  labelPlacement="floating"
                  type="password"
                  minlength={8}
                  value={adminPassword}
                  onIonInput={(event) =>
                    setAdminPassword(event.detail.value ?? '')
                  }
                  required
                />
                <IonButton type="submit">Create household</IonButton>
              </form>
              {message && <IonNote className="form-message">{message}</IonNote>}
            </IonCardContent>
          </IonCard>

          <IonCard className="admin-card">
            <IonCardContent>
              <h2>Household shells</h2>
              <IonList lines="full">
                {households.map((household) => (
                  <IonItem key={household.id}>
                    <IonLabel>
                      <h3>{household.name}</h3>
                      <p>
                        Created{' '}
                        {new Intl.DateTimeFormat('en-CA', {
                          dateStyle: 'medium',
                        }).format(new Date(household.created_at))}
                      </p>
                    </IonLabel>
                    <IonBadge slot="end" color="light">
                      {household.users_count}{' '}
                      {household.users_count === 1 ? 'user' : 'users'}
                    </IonBadge>
                    <IonButton
                      slot="end"
                      fill="clear"
                      color="danger"
                      aria-label={`Delete ${household.name}`}
                      onClick={() => void deleteHousehold(household)}
                    >
                      <IonIcon icon={trashOutline} />
                    </IonButton>
                  </IonItem>
                ))}
              </IonList>
            </IonCardContent>
          </IonCard>
        </main>
      </IonContent>
    </IonPage>
  )
}
