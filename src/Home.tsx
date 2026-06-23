import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonHeader,
  IonIcon,
  IonPage,
  IonText,
  IonTitle,
  IonToolbar,
} from '@ionic/react'
import {
  basketOutline,
  calendarOutline,
  cubeOutline,
  heartOutline,
  logOutOutline,
  peopleOutline,
  personCircleOutline,
} from 'ionicons/icons'
import { useHistory } from 'react-router-dom'
import { roleLabels, useAuth } from './auth'

const sections = [
  {
    title: 'Calendar',
    description: 'Plan appointments and household events.',
    icon: calendarOutline,
    color: 'primary',
    route: '/calendar',
  },
  {
    title: 'Shopping list',
    description: 'Keep one shared list for your next trip.',
    icon: basketOutline,
    color: 'success',
    route: '/shopping',
  },
  {
    title: 'Inventory',
    description: 'Track what you have and what is running low.',
    icon: cubeOutline,
    color: 'warning',
    route: '/inventory',
  },
  {
    title: 'Wish list',
    description: 'Save ideas and things you want to buy later.',
    icon: heartOutline,
    color: 'tertiary',
    route: '/wishlist',
  },
]

export function Home() {
  const history = useHistory()
  const { can, currentUser, logout } = useAuth()

  async function signOut() {
    await logout()
    history.replace('/login')
  }

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonTitle>HouseApp</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => history.push('/profile')}>
              <IonIcon slot="start" icon={personCircleOutline} />
              Profile
            </IonButton>
            {can('manage_users') && (
              <IonButton onClick={() => history.push('/admin/users')}>
                <IonIcon slot="start" icon={peopleOutline} />
                Users
              </IonButton>
            )}
            <IonButton aria-label="Sign out" onClick={() => void signOut()}>
              <IonIcon slot="icon-only" icon={logOutOutline} />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        <IonHeader collapse="condense">
          <IonToolbar>
            <IonTitle size="large">HouseApp</IonTitle>
          </IonToolbar>
        </IonHeader>

        <main className="dashboard">
          <section className="welcome">
            <div className="welcome-badges">
              <IonBadge color="light">Our household</IonBadge>
              {currentUser && (
                <IonBadge color="primary">
                  {roleLabels[currentUser.role]}
                </IonBadge>
              )}
            </div>
            <h1>Welcome, {currentUser?.name}.</h1>
            <IonText color="medium">
              Everything at home, in one private shared place.
            </IonText>
          </section>

          <section className="section-grid" aria-label="Household tools">
            {sections.map((section) => (
              <IonCard
                className="section-card"
                key={section.title}
                button
                onClick={() => section.route && history.push(section.route)}
              >
                <IonCardContent>
                  <IonIcon icon={section.icon} color={section.color} />
                  <div>
                    <h2>{section.title}</h2>
                    <p>{section.description}</p>
                  </div>
                </IonCardContent>
              </IonCard>
            ))}
          </section>
        </main>
      </IonContent>
    </IonPage>
  )
}
