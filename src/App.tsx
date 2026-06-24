import { IonApp, IonLoading, IonRouterOutlet, setupIonicReact } from '@ionic/react'
import { IonReactRouter } from '@ionic/react-router'
import { Redirect, Route } from 'react-router-dom'
import './App.css'
import { AuthProvider, useAuth } from './auth'
import { Calendar } from './Calendar'
import { Feedback } from './Feedback'
import { FeedbackBubble } from './FeedbackBubble'
import { Home } from './Home'
import { HouseholdManagement } from './HouseholdManagement'
import { HouseholdProvider } from './household'
import { Inventory } from './Inventory'
import { Login } from './Login'
import { Profile } from './Profile'
import { ShoppingList } from './ShoppingList'
import { UserManagement } from './UserManagement'
import { Wishlist } from './Wishlist'

setupIonicReact()

function Routes() {
  const { can, currentUser, loading } = useAuth()

  if (loading) return <IonLoading isOpen message="Loading HouseApp..." />

  return (
    <IonRouterOutlet>
      <Route exact path="/login">
        {currentUser ? <Redirect to="/home" /> : <Login />}
      </Route>
      <Route exact path="/home">
        {currentUser ? <Home /> : <Redirect to="/login" />}
      </Route>
      <Route exact path="/profile">
        {currentUser ? <Profile /> : <Redirect to="/login" />}
      </Route>
      <Route exact path="/calendar">
        {currentUser ? <Calendar /> : <Redirect to="/login" />}
      </Route>
      <Route exact path="/inventory">
        {currentUser ? <Inventory /> : <Redirect to="/login" />}
      </Route>
      <Route exact path="/shopping">
        {currentUser ? <ShoppingList /> : <Redirect to="/login" />}
      </Route>
      <Route exact path="/wishlist">
        {currentUser ? <Wishlist /> : <Redirect to="/login" />}
      </Route>
      <Route exact path="/feedback">
        {currentUser ? <Feedback /> : <Redirect to="/login" />}
      </Route>
      <Route exact path="/admin/users">
        {currentUser && can('manage_users') ? (
          <UserManagement />
        ) : (
          <Redirect to={currentUser ? '/home' : '/login'} />
        )}
      </Route>
      <Route exact path="/admin/households">
        {currentUser && can('manage_households') ? (
          <HouseholdManagement />
        ) : (
          <Redirect to={currentUser ? '/home' : '/login'} />
        )}
      </Route>
      <Route exact path="/">
        <Redirect to={currentUser ? '/home' : '/login'} />
      </Route>
    </IonRouterOutlet>
  )
}

function App() {
  return (
    <IonApp>
      <AuthProvider>
        <HouseholdProvider>
          <IonReactRouter>
            <Routes />
            <FeedbackBubble />
          </IonReactRouter>
        </HouseholdProvider>
      </AuthProvider>
    </IonApp>
  )
}

export default App
