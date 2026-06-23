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
  pencilOutline,
  timeOutline,
  trashOutline,
} from 'ionicons/icons'
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react'
import { api } from './api'
import { useAuth } from './auth'

type EventCategory = 'home' | 'appointment' | 'reminder' | 'social'

interface CalendarEvent {
  id: string
  title: string
  date: string
  startTime: string
  endTime: string
  category: EventCategory
  notes: string
  createdBy: string
  eventNotes: CalendarEventNote[]
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
  notes?: string | null
  creator?: { name: string } | null
  event_notes?: Array<{
    id: number
    body: string
    created_at: string
    author?: { name: string } | null
  }>
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
  const [notes, setNotes] = useState('')

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
        notes: event.notes ?? '',
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

  function resetEventForm(date = selectedDate) {
    setEditingEventId(null)
    setTitle('')
    setEventDate(date)
    setStartTime('')
    setEndTime('')
    setCategory('home')
    setNotes('')
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
    setNotes(event.notes)
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
        notes: notes.trim() || null,
      }),
      },
    )
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
              <IonTextarea
                fill="outline"
                label="Notes"
                labelPlacement="floating"
                autoGrow
                value={notes}
                onIonInput={(event) => setNotes(event.detail.value ?? '')}
              />
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
