/* eslint-disable react-hooks/set-state-in-effect */
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
  chatbubbleOutline,
  chevronBackOutline,
  chevronForwardOutline,
  locationOutline,
  notificationsOutline,
  pencilOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons'
import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { api, ApiError } from './api'
import { useAuth } from './auth'
import { enablePushNotifications } from './pushNotifications'

type EventCategory = 'home' | 'appointment' | 'reminder' | 'social'
type ReminderUnit = 'minutes' | 'hours' | 'days'

interface PlaceSuggestion {
  id: string
  label: string
  lat: number
  lng: number
}

interface PlaceSearchBias {
  lat: number
  lon: number
}

interface PhotonFeature {
  geometry?: {
    coordinates?: [number, number]
  }
  properties?: {
    osm_id?: number
    name?: string
    street?: string
    housenumber?: string
    city?: string
    state?: string
    country?: string
  }
}

interface PhotonResponse {
  features?: PhotonFeature[]
}

interface ReminderInput {
  id: string
  amount: string
  unit: ReminderUnit
}

interface CalendarReminder {
  id: string
  minutesBefore: number
}

interface CalendarEvent {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  category: EventCategory
  locationName: string
  locationUrl: string
  locationPlaceId: string
  locationLat: number | null
  locationLng: number | null
  notes: string
  createdBy: string
  eventNotes: CalendarEventNote[]
  reminders: CalendarReminder[]
}

interface CalendarEventNote {
  id: string
  body: string
  createdAt: string
  author: string
}

interface CalendarEventDto {
  id: number
  title: string
  event_date: string
  start_time?: string | null
  end_time?: string | null
  category: EventCategory
  location_name?: string | null
  location_url?: string | null
  location_place_id?: string | null
  location_lat?: number | string | null
  location_lng?: number | string | null
  notes?: string | null
  reminders?: Array<{
    id: number
    minutes_before: number
  }>
  creator?: { name: string } | null
  event_notes?: Array<{
    id: number
    body: string
    created_at: string
    author?: { name: string } | null
  }>
}

function reminderToMinutes(reminder: ReminderInput) {
  if (reminder.amount.trim() === '') return null
  const amount = Number(reminder.amount)
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0) return null
  if (reminder.unit === 'days') return amount * 24 * 60
  if (reminder.unit === 'hours') return amount * 60
  return amount
}

function minutesToReminderInput(minutes: number): ReminderInput {
  if (minutes >= 1440 && minutes % 1440 === 0) {
    return { id: crypto.randomUUID(), amount: String(minutes / 1440), unit: 'days' }
  }

  if (minutes >= 60 && minutes % 60 === 0) {
    return { id: crypto.randomUUID(), amount: String(minutes / 60), unit: 'hours' }
  }

  return { id: crypto.randomUUID(), amount: String(minutes), unit: 'minutes' }
}

function formatReminder(minutes: number) {
  const input = minutesToReminderInput(minutes)
  const amount = Number(input.amount)
  const label = amount === 1 ? input.unit.replace(/s$/, '') : input.unit

  return `${amount} ${label} before`
}

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const categoryLabels: Record<EventCategory, string> = {
  home: 'Home',
  appointment: 'Appointment',
  reminder: 'Reminder',
  social: 'Social',
}

function dateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function todayKey() {
  const today = new Date()
  return dateKey(today.getFullYear(), today.getMonth(), today.getDate())
}

function formatDate(key: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-CA', options).format(
    new Date(`${key}T12:00:00`),
  )
}

function googleMapsOpenUrl(
  event: Pick<CalendarEvent, 'locationName' | 'locationUrl' | 'locationLat' | 'locationLng'>,
) {
  if (event.locationUrl.trim()) return event.locationUrl.trim()

  if (event.locationLat !== null && event.locationLng !== null) {
    return `https://www.google.com/maps/search/?api=1&query=${event.locationLat},${event.locationLng}`
  }

  if (!event.locationName.trim()) return ''

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.locationName.trim())}`
}

function parseCoordinate(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === '') return null
  const coordinate = Number(value)

  return Number.isFinite(coordinate) ? coordinate : null
}

function photonLabel(feature: PhotonFeature) {
  const properties = feature.properties ?? {}
  const street = [properties.housenumber, properties.street]
    .filter(Boolean)
    .join(' ')
  const parts = [
    properties.name,
    street,
    properties.city,
    properties.state,
    properties.country,
  ].filter(Boolean)

  return [...new Set(parts)].join(', ')
}

async function searchPlaces(
  query: string,
  limit = 5,
  bias?: PlaceSearchBias | null,
): Promise<PlaceSuggestion[]> {
  const params = new URLSearchParams({
    q: query,
    limit: String(limit),
    lang: 'en',
  })

  if (bias) {
    params.set('lat', String(bias.lat))
    params.set('lon', String(bias.lon))
  }

  const response = await fetch(`https://photon.komoot.io/api/?${params}`)
  if (!response.ok) throw new Error('Location search is temporarily unavailable.')

  const data = (await response.json()) as PhotonResponse

  return (data.features ?? [])
    .map((feature, index) => {
      const [lng, lat] = feature.geometry?.coordinates ?? []
      const label = photonLabel(feature)

      if (
        typeof lat !== 'number' ||
        typeof lng !== 'number' ||
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        !label
      ) {
        return null
      }

      return {
        id: String(feature.properties?.osm_id ?? `${label}-${index}`),
        label,
        lat,
        lng,
      }
    })
    .filter((suggestion): suggestion is PlaceSuggestion => suggestion !== null)
}

function MiniMap({
  location,
}: {
  location: Pick<CalendarEvent, 'locationLat' | 'locationLng' | 'locationName'>
}) {
  if (location.locationLat === null || location.locationLng === null) {
    return <IonNote>Choose a suggestion to show the mini map.</IonNote>
  }

  const delta = 0.006
  const bbox = [
    location.locationLng - delta,
    location.locationLat - delta,
    location.locationLng + delta,
    location.locationLat + delta,
  ].join(',')
  const marker = `${location.locationLat},${location.locationLng}`

  return (
    <iframe
      className="osm-mini-map"
      title={`${location.locationName} map`}
      src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${marker}`}
    />
  )
}

export function Calendar() {
  const { can } = useAuth()
  const editable = can('edit_household')
  const initialDate = new Date()
  const [displayMonth, setDisplayMonth] = useState(
    new Date(initialDate.getFullYear(), initialDate.getMonth(), 1),
  )
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [showEventForm, setShowEventForm] = useState(false)
  const [editingEventId, setEditingEventId] = useState<string | null>(null)
  const [noteEventId, setNoteEventId] = useState<string | null>(null)
  const [newNote, setNewNote] = useState('')
  const [title, setTitle] = useState('')
  const [eventDate, setEventDate] = useState(todayKey)
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [category, setCategory] = useState<EventCategory>('home')
  const [locationName, setLocationName] = useState('')
  const [locationUrl, setLocationUrl] = useState('')
  const [locationPlaceId, setLocationPlaceId] = useState('')
  const [locationLat, setLocationLat] = useState<number | null>(null)
  const [locationLng, setLocationLng] = useState<number | null>(null)
  const [notes, setNotes] = useState('')
  const [reminders, setReminders] = useState<ReminderInput[]>([])
  const [formMessage, setFormMessage] = useState('')
  const [pushMessage, setPushMessage] = useState('')
  const [mapMessage, setMapMessage] = useState('')
  const [placeSuggestions, setPlaceSuggestions] = useState<PlaceSuggestion[]>([])
  const [placeSearchBias, setPlaceSearchBias] = useState<PlaceSearchBias | null>(null)
  const [placeSearchBiasRequested, setPlaceSearchBiasRequested] = useState(false)

  const calendarDays = useMemo(() => {
    const year = displayMonth.getFullYear()
    const month = displayMonth.getMonth()
    const firstWeekday = new Date(year, month, 1).getDay()

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(year, month, index - firstWeekday + 1)
      return {
        key: dateKey(date.getFullYear(), date.getMonth(), date.getDate()),
        day: date.getDate(),
        inMonth: date.getMonth() === month,
      }
    })
  }, [displayMonth])

  const selectedEvents = useMemo(
    () =>
      events
        .filter((event) => event.date === selectedDate)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [events, selectedDate],
  )

  const loadEvents = useCallback(async () => {
    const data = await api<CalendarEventDto[]>('/calendar-events')
    setEvents(
      data.map((event) => ({
        id: String(event.id),
        title: event.title,
        date: event.event_date,
        startTime: event.start_time?.slice(0, 5) ?? '',
        endTime: event.end_time?.slice(0, 5) ?? '',
        category: event.category,
        locationName: event.location_name ?? '',
        locationUrl: event.location_url ?? '',
        locationPlaceId: event.location_place_id ?? '',
        locationLat: parseCoordinate(event.location_lat),
        locationLng: parseCoordinate(event.location_lng),
        notes: event.notes ?? '',
        reminders: (event.reminders ?? []).map((reminder) => ({
          id: String(reminder.id),
          minutesBefore: reminder.minutes_before,
        })),
        createdBy: event.creator?.name ?? 'Household member',
        eventNotes: (event.event_notes ?? []).map((note) => ({
          id: String(note.id),
          body: note.body,
          createdAt: note.created_at,
          author: note.author?.name ?? 'Household member',
        })),
      })),
    )
  }, [])

  useEffect(() => {
    void loadEvents()
  }, [loadEvents])

  useEffect(() => {
    if (
      !showEventForm ||
      placeSearchBiasRequested ||
      placeSearchBias ||
      !navigator.geolocation
    ) {
      return
    }

    setPlaceSearchBiasRequested(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setPlaceSearchBias({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        })
      },
      () => undefined,
      {
        enableHighAccuracy: false,
        maximumAge: 10 * 60 * 1000,
        timeout: 5000,
      },
    )
  }, [placeSearchBias, placeSearchBiasRequested, showEventForm])

  function resetEventForm(date = selectedDate) {
    setEditingEventId(null)
    setTitle('')
    setEventDate(date)
    setStartTime('')
    setEndTime('')
    setCategory('home')
    setLocationName('')
    setLocationUrl('')
    setLocationPlaceId('')
    setLocationLat(null)
    setLocationLng(null)
    setNotes('')
    setReminders([])
    setFormMessage('')
    setPushMessage('')
  }

  function openEventForm(date = selectedDate) {
    resetEventForm(date)
    setShowEventForm(true)
  }

  function openEditEventForm(event: CalendarEvent) {
    setEditingEventId(event.id)
    setTitle(event.title)
    setEventDate(event.date)
    setStartTime(event.startTime)
    setEndTime(event.endTime)
    setCategory(event.category)
    setLocationName(event.locationName)
    setLocationUrl(event.locationUrl)
    setLocationPlaceId(event.locationPlaceId)
    setLocationLat(event.locationLat)
    setLocationLng(event.locationLng)
    setNotes(event.notes)
    setReminders(event.reminders.map((reminder) => minutesToReminderInput(reminder.minutesBefore)))
    setFormMessage('')
    setPushMessage('')
    setShowEventForm(true)
  }

  function changeMonth(offset: number) {
    const next = new Date(
      displayMonth.getFullYear(),
      displayMonth.getMonth() + offset,
      1,
    )
    setDisplayMonth(next)
    setSelectedDate(dateKey(next.getFullYear(), next.getMonth(), 1))
  }

  function selectDay(key: string) {
    setSelectedDate(key)
    const selected = new Date(`${key}T12:00:00`)
    if (selected.getMonth() !== displayMonth.getMonth()) {
      setDisplayMonth(
        new Date(selected.getFullYear(), selected.getMonth(), 1),
      )
    }
  }

  async function saveEvent(event: FormEvent) {
    event.preventDefault()
    setFormMessage('')

    const reminderMinutes = reminders
      .map(reminderToMinutes)
      .filter((minutes): minutes is number => minutes !== null)

    if (reminderMinutes.length !== reminders.length) {
      setFormMessage('Reminder amounts must be whole numbers.')
      return
    }

    const uniqueReminderMinutes = [...new Set(reminderMinutes)].sort((a, b) => b - a)

    if (uniqueReminderMinutes.length > 0 && !startTime) {
      setFormMessage('Add a start time so HouseApp knows when to send reminders.')
      return
    }

    try {
      await api(
        editingEventId
          ? `/calendar-events/${editingEventId}`
          : '/calendar-events',
        {
        method: editingEventId ? 'PUT' : 'POST',
        body: JSON.stringify({
          title: title.trim(),
          event_date: eventDate,
          start_time: startTime || null,
          end_time: endTime || null,
          category,
          location_name: locationName.trim() || null,
          location_url: locationUrl.trim() || (
            locationLat !== null && locationLng !== null
              ? googleMapsOpenUrl({
                locationName,
                locationUrl: '',
                locationLat,
                locationLng,
              })
              : null
          ),
          location_place_id: locationPlaceId.trim() || null,
          location_lat: locationLat,
          location_lng: locationLng,
          notes: notes.trim() || null,
          reminders: uniqueReminderMinutes.map((minutesBefore) => ({
            minutes_before: minutesBefore,
          })),
        }),
        },
      )
    } catch (error) {
      setFormMessage(error instanceof ApiError ? error.message : 'The event could not be saved.')
      return
    }
    await loadEvents()
    setSelectedDate(eventDate)
    const selected = new Date(`${eventDate}T12:00:00`)
    setDisplayMonth(new Date(selected.getFullYear(), selected.getMonth(), 1))
    resetEventForm(eventDate)
    setShowEventForm(false)
  }

  async function deleteEvent(eventId: string) {
    const event = events.find((candidate) => candidate.id === eventId)
    if (!window.confirm(`Delete ${event?.title ?? 'this event'}?`)) return
    await api(`/calendar-events/${eventId}`, { method: 'DELETE' })
    await loadEvents()
  }

  async function addEventNote(event: FormEvent) {
    event.preventDefault()
    if (!noteEventId || !newNote.trim()) return
    await api(`/calendar-events/${noteEventId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ body: newNote.trim() }),
    })
    setNewNote('')
    await loadEvents()
  }

  function addReminder() {
    setReminders((current) => [
      ...current,
      { id: crypto.randomUUID(), amount: '30', unit: 'minutes' },
    ])
  }

  function updateReminder(id: string, update: Partial<ReminderInput>) {
    setReminders((current) =>
      current.map((reminder) =>
        reminder.id === id ? { ...reminder, ...update } : reminder,
      ),
    )
  }

  function removeReminder(id: string) {
    setReminders((current) => current.filter((reminder) => reminder.id !== id))
  }

  function applyPlaceSuggestion(suggestion: PlaceSuggestion) {
    setLocationName(suggestion.label)
    setLocationUrl(googleMapsOpenUrl({
      locationName: suggestion.label,
      locationUrl: '',
      locationLat: suggestion.lat,
      locationLng: suggestion.lng,
    }))
    setLocationPlaceId(`osm:${suggestion.id}`)
    setLocationLat(suggestion.lat)
    setLocationLng(suggestion.lng)
    setPlaceSuggestions([])
    setMapMessage('Location pinned.')
  }

  useEffect(() => {
    if (!showEventForm || locationPlaceId || locationName.trim().length < 3) {
      setPlaceSuggestions([])
      return
    }

    let cancelled = false
    const timer = window.setTimeout(() => {
      searchPlaces(locationName.trim(), 5, placeSearchBias)
        .then((suggestions) => {
          if (cancelled) return
          setPlaceSuggestions(suggestions)
          const first = suggestions[0]
          if (first) {
            setLocationLat(first.lat)
            setLocationLng(first.lng)
            setLocationUrl(googleMapsOpenUrl({
              locationName: first.label,
              locationUrl: '',
              locationLat: first.lat,
              locationLng: first.lng,
            }))
          }
        })
        .catch(() => {
          if (!cancelled) setMapMessage('Location search is temporarily unavailable.')
        })
    }, 500)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [locationName, locationPlaceId, placeSearchBias, showEventForm])

  async function enablePushForDevice() {
    setPushMessage('')
    try {
      await enablePushNotifications()
      setPushMessage('Push notifications are enabled on this device.')
    } catch (error) {
      setPushMessage(error instanceof Error ? error.message : 'Push notifications could not be enabled.')
    }
  }

  async function resolveLocation() {
    setMapMessage('')

    if (!locationName.trim()) {
      setMapMessage('Enter an address or place first.')
      return
    }

    try {
      const [suggestion] = await searchPlaces(locationName.trim(), 1, placeSearchBias)
      if (!suggestion) {
        setMapMessage('That address could not be resolved. Try a more specific address.')
        return
      }
      applyPlaceSuggestion(suggestion)
    } catch {
      setMapMessage('Location search is temporarily unavailable.')
    }
  }

  const noteEvent = events.find((event) => event.id === noteEventId) ?? null

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Calendar</IonTitle>
          {editable && (
            <IonButtons slot="end">
              <IonButton onClick={() => openEventForm()}>
                <IonIcon slot="start" icon={addOutline} />
                Add event
              </IonButton>
            </IonButtons>
          )}
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <main className="calendar-layout">
          <section className="calendar-heading">
            <div>
              <p className="eyebrow">Shared schedule</p>
              <h1>Calendar</h1>
              <IonText color="medium">
                See the month at a glance, then use the agenda for the details.
              </IonText>
            </div>
            <IonButton fill="outline" onClick={() => {
              const today = new Date()
              setDisplayMonth(new Date(today.getFullYear(), today.getMonth(), 1))
              setSelectedDate(todayKey())
            }}>
              Today
            </IonButton>
          </section>

          <div className="calendar-workspace">
            <IonCard className="calendar-card">
              <IonCardContent>
                <div className="month-toolbar">
                  <IonButton
                    fill="clear"
                    aria-label="Previous month"
                    onClick={() => changeMonth(-1)}
                  >
                    <IonIcon slot="icon-only" icon={chevronBackOutline} />
                  </IonButton>
                  <h2>
                    {displayMonth.toLocaleDateString('en-CA', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </h2>
                  <IonButton
                    fill="clear"
                    aria-label="Next month"
                    onClick={() => changeMonth(1)}
                  >
                    <IonIcon slot="icon-only" icon={chevronForwardOutline} />
                  </IonButton>
                </div>

                <div className="calendar-grid weekday-row">
                  {weekdays.map((weekday) => (
                    <div key={weekday}>{weekday}</div>
                  ))}
                </div>
                <div className="calendar-grid month-grid">
                  {calendarDays.map((day) => {
                    const dayEvents = events.filter(
                      (event) => event.date === day.key,
                    )
                    return (
                      <button
                        className={`calendar-day${day.inMonth ? '' : ' outside-month'}${day.key === selectedDate ? ' selected' : ''}${day.key === todayKey() ? ' today' : ''}`}
                        key={day.key}
                        type="button"
                        onClick={() => selectDay(day.key)}
                        onDoubleClick={() => editable && openEventForm(day.key)}
                      >
                        <span className="day-number">{day.day}</span>
                        <span className="day-events">
                          {dayEvents.slice(0, 2).map((event) => (
                            <span
                              className={`event-pill ${event.category}`}
                              key={event.id}
                            >
                              {event.title}
                            </span>
                          ))}
                          {dayEvents.length > 2 && (
                            <span className="more-events">
                              +{dayEvents.length - 2} more
                            </span>
                          )}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </IonCardContent>
            </IonCard>

            <aside className="agenda-panel">
              <div className="agenda-heading">
                <div>
                  <p className="eyebrow">Daily agenda</p>
                  <h2>
                    {formatDate(selectedDate, {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </h2>
                </div>
                {editable && (
                  <IonButton
                    size="small"
                    fill="clear"
                    onClick={() => openEventForm()}
                  >
                    <IonIcon slot="start" icon={addOutline} />
                    Add
                  </IonButton>
                )}
              </div>

              {selectedEvents.length === 0 ? (
                <div className="empty-agenda">
                  <IonText color="medium">Nothing planned for this day.</IonText>
                  {editable && (
                    <IonButton fill="outline" onClick={() => openEventForm()}>
                      Add the first event
                    </IonButton>
                  )}
                </div>
              ) : (
                <div className="agenda-list">
                  {selectedEvents.map((event) => (
                    <article
                      className={`agenda-item ${event.category}`}
                      key={event.id}
                    >
                      <div className="agenda-item-heading">
                        <div>
                          <span className="category-label">
                            {categoryLabels[event.category]}
                          </span>
                          <h3>{event.title}</h3>
                        </div>
                        <div className="agenda-item-actions">
                          <IonButton
                            fill="clear"
                            size="small"
                            onClick={() => setNoteEventId(event.id)}
                          >
                            <IonIcon slot="start" icon={chatbubbleOutline} />
                            Notes{event.eventNotes.length > 0 ? ` (${event.eventNotes.length})` : ''}
                          </IonButton>
                          {editable && (
                            <>
                              <IonButton
                                fill="clear"
                                size="small"
                                aria-label={`Edit ${event.title}`}
                                onClick={() => openEditEventForm(event)}
                              >
                                <IonIcon slot="icon-only" icon={pencilOutline} />
                              </IonButton>
                              <IonButton
                                fill="clear"
                                size="small"
                                color="medium"
                                aria-label={`Delete ${event.title}`}
                                onClick={() => void deleteEvent(event.id)}
                              >
                                <IonIcon slot="icon-only" icon={trashOutline} />
                              </IonButton>
                            </>
                          )}
                        </div>
                      </div>
                      {(event.startTime || event.endTime) && (
                        <p className="event-time">
                          <IonIcon icon={timeOutline} />
                          {event.startTime || 'Any time'}
                          {event.endTime && ` - ${event.endTime}`}
                        </p>
                      )}
                      {event.reminders.length > 0 && (
                        <p className="event-reminders">
                          <IonIcon icon={notificationsOutline} />
                          {event.reminders
                            .map((reminder) => formatReminder(reminder.minutesBefore))
                            .join(', ')}
                        </p>
                      )}
                      {(event.locationName || event.locationUrl) && (
                        <section className="event-location">
                          <p>
                            <IonIcon icon={locationOutline} />
                            {event.locationName || 'Location'}
                          </p>
                          <MiniMap location={event} />
                          <IonButton
                            fill="clear"
                            size="small"
                            href={googleMapsOpenUrl(event)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open in Google Maps
                          </IonButton>
                        </section>
                      )}
                      {event.notes && <p className="event-notes">{event.notes}</p>}
                      <IonNote>Added by {event.createdBy}</IonNote>
                    </article>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </main>

        <IonModal
          isOpen={showEventForm}
          onDidDismiss={() => {
            setShowEventForm(false)
            resetEventForm()
          }}
        >
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setShowEventForm(false)}>
                  Cancel
                </IonButton>
              </IonButtons>
              <IonTitle>{editingEventId ? 'Edit event' : 'New event'}</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <form className="event-form" onSubmit={saveEvent}>
              <IonInput
                fill="outline"
                label="Event title"
                labelPlacement="floating"
                value={title}
                onIonInput={(event) => setTitle(event.detail.value ?? '')}
                required
              />
              <IonInput
                fill="outline"
                label="Date"
                labelPlacement="floating"
                type="date"
                value={eventDate}
                onIonInput={(event) => setEventDate(event.detail.value ?? '')}
                required
              />
              <div className="time-fields">
                <IonInput
                  fill="outline"
                  label="Starts"
                  labelPlacement="floating"
                  type="time"
                  value={startTime}
                  onIonInput={(event) => setStartTime(event.detail.value ?? '')}
                />
                <IonInput
                  fill="outline"
                  label="Ends"
                  labelPlacement="floating"
                  type="time"
                  value={endTime}
                  onIonInput={(event) => setEndTime(event.detail.value ?? '')}
                />
              </div>
              <IonSelect
                fill="outline"
                label="Category"
                labelPlacement="floating"
                value={category}
                onIonChange={(event) =>
                  setCategory(event.detail.value as EventCategory)
                }
              >
                {Object.entries(categoryLabels).map(([value, label]) => (
                  <IonSelectOption key={value} value={value}>
                    {label}
                  </IonSelectOption>
                ))}
              </IonSelect>
              <label className="map-place-field">
                <span>Address or place</span>
                <input
                  type="text"
                  value={locationName}
                  placeholder="Start typing an address or place"
                  onChange={(event) => {
                    setLocationName(event.target.value)
                    setLocationPlaceId('')
                    setLocationLat(null)
                    setLocationLng(null)
                    setLocationUrl('')
                    setMapMessage('')
                  }}
                />
              </label>
              {placeSuggestions.length > 0 && (
                <div className="map-place-suggestions">
                  {placeSuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => applyPlaceSuggestion(suggestion)}
                    >
                      {suggestion.label}
                    </button>
                  ))}
                </div>
              )}
              <IonButton
                fill="outline"
                type="button"
                onClick={() => void resolveLocation()}
              >
                <IonIcon slot="start" icon={locationOutline} />
                Resolve address
              </IonButton>
              <IonInput
                fill="outline"
                label="Google Maps link"
                labelPlacement="floating"
                type="url"
                value={locationUrl}
                onIonInput={(event) => setLocationUrl(event.detail.value ?? '')}
              />
              {(locationName.trim() || locationUrl.trim()) && (
                <section className="event-location event-location-preview">
                  <p>
                    <IonIcon icon={locationOutline} />
                    Map preview
                  </p>
                  {locationLat !== null && locationLng !== null ? (
                    <MiniMap
                      location={{
                        locationName,
                        locationLat,
                        locationLng,
                      }}
                    />
                  ) : (
                    <IonNote>
                      Choose a suggestion to pin this location on the map.
                    </IonNote>
                  )}
                </section>
              )}
              {mapMessage && <IonNote>{mapMessage}</IonNote>}
              <IonTextarea
                fill="outline"
                label="Notes"
                labelPlacement="floating"
                autoGrow
                value={notes}
                onIonInput={(event) => setNotes(event.detail.value ?? '')}
              />
              <section className="event-reminder-form">
                <div>
                  <h3>Reminders</h3>
                  <IonNote>
                    Add as many reminders as you want before the event. Push
                    reminders need a start time.
                  </IonNote>
                </div>
                {reminders.map((reminder) => (
                  <div className="event-reminder-row" key={reminder.id}>
                    <IonInput
                      fill="outline"
                      label="Amount"
                      labelPlacement="floating"
                      min="0"
                      step="1"
                      type="number"
                      value={reminder.amount}
                      onIonInput={(event) =>
                        updateReminder(reminder.id, {
                          amount: event.detail.value ?? '',
                        })
                      }
                    />
                    <IonSelect
                      fill="outline"
                      label="Before"
                      labelPlacement="floating"
                      value={reminder.unit}
                      onIonChange={(event) =>
                        updateReminder(reminder.id, {
                          unit: event.detail.value as ReminderUnit,
                        })
                      }
                    >
                      <IonSelectOption value="minutes">Minutes</IonSelectOption>
                      <IonSelectOption value="hours">Hours</IonSelectOption>
                      <IonSelectOption value="days">Days</IonSelectOption>
                    </IonSelect>
                    <IonButton
                      fill="clear"
                      color="medium"
                      aria-label="Remove reminder"
                      onClick={() => removeReminder(reminder.id)}
                    >
                      <IonIcon slot="icon-only" icon={trashOutline} />
                    </IonButton>
                  </div>
                ))}
                <div className="event-reminder-actions">
                  <IonButton fill="outline" type="button" onClick={addReminder}>
                    <IonIcon slot="start" icon={addOutline} />
                    Add reminder
                  </IonButton>
                  <IonButton
                    fill="outline"
                    type="button"
                    onClick={() => void enablePushForDevice()}
                  >
                    <IonIcon slot="start" icon={notificationsOutline} />
                    Enable push
                  </IonButton>
                </div>
                {pushMessage && <IonNote>{pushMessage}</IonNote>}
              </section>
              {formMessage && (
                <IonText color="danger" className="form-message">
                  {formMessage}
                </IonText>
              )}
              <IonButton type="submit" expand="block">
                {editingEventId ? 'Save changes' : 'Add to calendar'}
              </IonButton>
            </form>
          </IonContent>
        </IonModal>

        <IonModal
          isOpen={noteEvent !== null}
          onDidDismiss={() => {
            setNoteEventId(null)
            setNewNote('')
          }}
        >
          <IonHeader>
            <IonToolbar>
              <IonButtons slot="start">
                <IonButton onClick={() => setNoteEventId(null)}>Close</IonButton>
              </IonButtons>
              <IonTitle>Event notes</IonTitle>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <div className="event-note-view">
              <section className="event-note-heading">
                <span className="category-label">
                  {noteEvent ? categoryLabels[noteEvent.category] : ''}
                </span>
                <h2>{noteEvent?.title}</h2>
                <IonNote>
                  {noteEvent
                    ? formatDate(noteEvent.date, {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })
                    : ''}
                </IonNote>
              </section>

              {noteEvent?.eventNotes.length === 0 ? (
                <div className="empty-event-notes">
                  <IonIcon icon={chatbubbleOutline} />
                  <IonText color="medium">No notes have been added yet.</IonText>
                </div>
              ) : (
                <section className="event-note-list" aria-label="Event notes">
                  {noteEvent?.eventNotes.map((note) => (
                    <article className="event-note" key={note.id}>
                      <p>{note.body}</p>
                      <IonNote>
                        {note.author} ·{' '}
                        {new Intl.DateTimeFormat('en-CA', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        }).format(new Date(note.createdAt))}
                      </IonNote>
                    </article>
                  ))}
                </section>
              )}

              {editable && (
                <form className="event-note-form" onSubmit={addEventNote}>
                  <IonTextarea
                    fill="outline"
                    label="Add a note"
                    labelPlacement="floating"
                    autoGrow
                    value={newNote}
                    onIonInput={(event) => setNewNote(event.detail.value ?? '')}
                    required
                  />
                  <IonButton type="submit" expand="block">
                    Add note
                  </IonButton>
                </form>
              )}
            </div>
          </IonContent>
        </IonModal>
      </IonContent>
    </IonPage>
  )
}
