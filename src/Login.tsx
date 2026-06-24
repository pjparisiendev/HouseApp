import {
  IonButton,
  IonCard,
  IonCardContent,
  IonContent,
  IonInput,
  IonItem,
  IonPage,
  IonText,
} from '@ionic/react'
import { type FormEvent, useState } from 'react'
import { useHistory } from 'react-router-dom'
import { useAuth } from './auth'

export function Login() {
  const history = useHistory()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    if (await login(username, password)) {
      history.replace('/home')
      return
    }
    setSubmitting(false)
    setError('The username or password is incorrect.')
  }

  return (
    <IonPage>
      <IonContent fullscreen className="login-page">
        <main className="login-shell">
          <section className="login-intro">
            <span className="brand-mark">H</span>
            <p className="eyebrow">HouseApp</p>
            <h1>Welcome home.</h1>
            <IonText color="medium">
              Sign in to your private household space.
            </IonText>
          </section>

          <IonCard className="login-card">
            <IonCardContent>
              <h2>Sign in</h2>
              <form onSubmit={handleSubmit}>
                <IonItem lines="full">
                  <IonInput
                    label="Username"
                    labelPlacement="stacked"
                    type="text"
                    autocomplete="username"
                    value={username}
                    onIonInput={(event) =>
                      setUsername(event.detail.value ?? '')
                    }
                    required
                  />
                </IonItem>
                <IonItem lines="full">
                  <IonInput
                    label="Password"
                    labelPlacement="stacked"
                    type="password"
                    autocomplete="current-password"
                    value={password}
                    onIonInput={(event) => setPassword(event.detail.value ?? '')}
                    required
                  />
                </IonItem>
                {error && (
                  <IonText color="danger" className="form-message">
                    {error}
                  </IonText>
                )}
                <IonButton type="submit" expand="block" disabled={submitting}>
                  {submitting ? 'Signing in...' : 'Sign in'}
                </IonButton>
              </form>
            </IonCardContent>
          </IonCard>
        </main>
      </IonContent>
    </IonPage>
  )
}
