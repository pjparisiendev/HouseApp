import {
  IonBackButton,
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
  IonSelect,
  IonSelectOption,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { trashOutline } from 'ionicons/icons'
import { type FormEvent, useState } from 'react'
import { roleLabels, type Role, useAuth } from './auth'

const roles = Object.keys(roleLabels) as Role[]

export function UserManagement() {
  const { addUser, currentUser, deleteUser, updateUserRole, users } = useAuth()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('member')
  const [message, setMessage] = useState('')

  async function handleAddUser(event: FormEvent) {
    event.preventDefault()
    const added = await addUser({
      name: name.trim(),
      username: username.trim(),
      password,
      role,
    })
    setMessage(
      added
        ? `${name.trim()} was added as ${roleLabels[role]}.`
        : 'That username is already in the household.',
    )
    if (added) {
      setName('')
      setUsername('')
      setPassword('')
      setRole('member')
    }
  }

  async function handleDeleteUser(userId: number, name: string) {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return

    setMessage(
      (await deleteUser(userId))
        ? `${name} was deleted.`
        : 'The user could not be deleted.',
    )
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Users and permissions</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <main className="admin-layout">
          <section>
            <p className="eyebrow">Household access</p>
            <h1>Users and permissions</h1>
            <IonText color="medium">
              Admins manage users, Members can edit household data, and
              Viewers have read-only access.
            </IonText>
          </section>

          <IonCard className="admin-card">
            <IonCardContent>
              <h2>Add a user</h2>
              <form className="user-form" onSubmit={handleAddUser}>
                <IonInput
                  fill="outline"
                  label="Name"
                  labelPlacement="floating"
                  value={name}
                  onIonInput={(event) => setName(event.detail.value ?? '')}
                  required
                />
                <IonInput
                  fill="outline"
                  label="Username"
                  labelPlacement="floating"
                  type="text"
                  autocomplete="username"
                  value={username}
                  onIonInput={(event) =>
                    setUsername(event.detail.value ?? '')
                  }
                  required
                />
                <IonSelect
                  fill="outline"
                  label="Role"
                  labelPlacement="floating"
                  value={role}
                  onIonChange={(event) => setRole(event.detail.value as Role)}
                >
                  {roles.map((option) => (
                    <IonSelectOption key={option} value={option}>
                      {roleLabels[option]}
                    </IonSelectOption>
                  ))}
                </IonSelect>
                <IonInput
                  fill="outline"
                  label="Initial password"
                  labelPlacement="floating"
                  type="password"
                  autocomplete="new-password"
                  minlength={8}
                  value={password}
                  onIonInput={(event) =>
                    setPassword(event.detail.value ?? '')
                  }
                  required
                />
                <IonButton type="submit">Add user</IonButton>
              </form>
              {message && <IonNote className="form-message">{message}</IonNote>}
            </IonCardContent>
          </IonCard>

          <IonCard className="admin-card">
            <IonCardContent>
              <h2>Household members</h2>
              <IonList lines="full">
                {users.map((user) => {
                  const isCurrentUser = user.id === currentUser?.id
                  return (
                    <IonItem key={user.id}>
                      <IonLabel>
                        <h3>{user.name}</h3>
                        <p>@{user.username}</p>
                      </IonLabel>
                      <IonSelect
                        aria-label={`${user.name} role`}
                        interface="popover"
                        value={user.role}
                        disabled={isCurrentUser}
                        onIonChange={(event) =>
                          void updateUserRole(
                            user.id,
                            event.detail.value as Role,
                          )
                        }
                      >
                        {roles.map((option) => (
                          <IonSelectOption key={option} value={option}>
                            {roleLabels[option]}
                          </IonSelectOption>
                        ))}
                      </IonSelect>
                      {isCurrentUser && <IonNote slot="end">You</IonNote>}
                      {!isCurrentUser && (
                        <IonButton
                          slot="end"
                          fill="clear"
                          color="danger"
                          aria-label={`Delete ${user.name}`}
                          onClick={() => void handleDeleteUser(user.id, user.name)}
                        >
                          <IonIcon icon={trashOutline} />
                        </IonButton>
                      )}
                    </IonItem>
                  )
                })}
              </IonList>
            </IonCardContent>
          </IonCard>
        </main>
      </IonContent>
    </IonPage>
  )
}
