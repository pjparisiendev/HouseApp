import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonInput,
  IonNote,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import { type FormEvent, useState } from 'react'
import { roleLabels, useAuth } from './auth'

export function Profile() {
  const { changePassword, currentUser, updateProfile } = useAuth()
  const [name, setName] = useState(currentUser?.name ?? '')
  const [profileMessage, setProfileMessage] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')

  async function saveProfile(event: FormEvent) {
    event.preventDefault()
    setProfileMessage(
      (await updateProfile(name))
        ? 'Your profile was updated.'
        : 'Enter your name.',
    )
  }

  async function savePassword(event: FormEvent) {
    event.preventDefault()
    if (newPassword !== confirmPassword) {
      setPasswordMessage('The new passwords do not match.')
      return
    }

    const changed = await changePassword(currentPassword, newPassword)
    setPasswordMessage(
      changed
        ? 'Your password was changed.'
        : 'Check your current password. New passwords need at least 8 characters.',
    )
    if (changed) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Profile</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <main className="profile-layout">
          <section>
            <p className="eyebrow">Your account</p>
            <h1>{currentUser?.name}</h1>
            <div className="profile-identity">
              <IonText color="medium">@{currentUser?.username}</IonText>
              {currentUser && (
                <IonBadge color="primary">
                  {roleLabels[currentUser.role]}
                </IonBadge>
              )}
            </div>
          </section>

          <div className="profile-grid">
            <IonCard className="admin-card">
              <IonCardContent>
                <h2>Personal details</h2>
                <form className="profile-form" onSubmit={saveProfile}>
                  <IonInput
                    fill="outline"
                    label="Display name"
                    labelPlacement="floating"
                    value={name}
                    onIonInput={(event) => setName(event.detail.value ?? '')}
                    required
                  />
                  <IonButton type="submit">Save name</IonButton>
                </form>
                {profileMessage && (
                  <IonNote className="form-message">{profileMessage}</IonNote>
                )}
              </IonCardContent>
            </IonCard>

            <IonCard className="admin-card">
              <IonCardContent>
                <h2>Change password</h2>
                <form className="profile-form" onSubmit={savePassword}>
                  <IonInput
                    fill="outline"
                    label="Current password"
                    labelPlacement="floating"
                    type="password"
                    autocomplete="current-password"
                    value={currentPassword}
                    onIonInput={(event) =>
                      setCurrentPassword(event.detail.value ?? '')
                    }
                    required
                  />
                  <IonInput
                    fill="outline"
                    label="New password"
                    labelPlacement="floating"
                    type="password"
                    autocomplete="new-password"
                    minlength={8}
                    value={newPassword}
                    onIonInput={(event) =>
                      setNewPassword(event.detail.value ?? '')
                    }
                    required
                  />
                  <IonInput
                    fill="outline"
                    label="Confirm new password"
                    labelPlacement="floating"
                    type="password"
                    autocomplete="new-password"
                    minlength={8}
                    value={confirmPassword}
                    onIonInput={(event) =>
                      setConfirmPassword(event.detail.value ?? '')
                    }
                    required
                  />
                  <IonButton type="submit">Change password</IonButton>
                </form>
                {passwordMessage && (
                  <IonNote className="form-message">{passwordMessage}</IonNote>
                )}
              </IonCardContent>
            </IonCard>
          </div>
        </main>
      </IonContent>
    </IonPage>
  )
}
