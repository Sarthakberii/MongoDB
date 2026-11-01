import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowRight, Bot, Check, ChevronDown, Clapperboard, Clock3, Film, MessageCircle, Minus, Moon, Monitor, Plus, Send, Sparkles, Star, Sun, Ticket, X } from 'lucide-react';

const api = async (path, options = {}) => {
  const r = await fetch(path, { headers: { 'Content-Type': 'application/json' }, ...options });
  const d = await r.json();
  if (!r.ok) throw Error(d.error || 'Something went wrong.');
  return d;
};

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function App() {
  const [movies, setMovies] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [showtimes, setShowtimes] = useState([]);
  const [filter, setFilter] = useState('All films');
  const [active, setActive] = useState('');
  const [date, setDate] = useState(today());
  const [time, setTime] = useState('06:30 PM');
  const [seats, setSeats] = useState(2);
  const [notice, setNotice] = useState('');
  const [chatOpen, setChatOpen] = useState(true);
  const [messages, setMessages] = useState([{ from: 'bot', text: 'Hey there! 🍿 Tell me what kind of film you want, ask for a recommendation, or ask me to book or manage a booking.' }]);
  const [input, setInput] = useState('');
  const [step, setStep] = useState('');
  const [chatMovie, setChatMovie] = useState(null);
  const [chatDraft, setChatDraft] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('cinema-theme') || 'auto');
  const [systemTheme, setSystemTheme] = useState(() => window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  const [demand, setDemand] = useState(null);
  const activeTheme = theme === 'auto' ? systemTheme : theme;
  const chatEnd = useRef(null);

  useEffect(() => {
    api('/api/movies')
      .then((d) => {
        setMovies(d.movies);
        setShowtimes(d.showtimes);
      })
      .catch(() => setNotice('Could not reach the API. Start the backend with npm start inside the backend folder.'));
  }, []);

  useEffect(() => {
    localStorage.setItem('cinema-theme', theme);
  }, [theme]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const update = (e) => setSystemTheme(e.matches ? 'light' : 'dark');
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    chatEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, step]);

  useEffect(() => {
    if (!active) return;
    const m = movies.find((x) => x.id === active);
    const hour = time.includes('09') ? 21 : time.includes('06') ? 18 : time.includes('03') ? 15 : 12;
    api(`/api/demand?movie_id=${m?.id || 'orbit'}&day_of_week=${new Date(date).getDay()||0}&show_hour=${hour}`)
      .then((d) => setDemand(d))
      .catch(() => setDemand(null));
  }, [active, date, time, movies]);

  useEffect(() => {
    api('/api/bookings')
      .then((d) => setBookings(d.bookings || []))
      .catch(() => setBookings([]));
  }, []);

  const genres = ['All films', ...new Set(movies.map((m) => m.genre.split(' · ')[0]))];
  const visible = useMemo(() => (filter === 'All films' ? movies : movies.filter((m) => m.genre.includes(filter))), [movies, filter]);

  const say = (text, actions = []) => setMessages((a) => [...a, { from: 'bot', text, actions }]);
  const defaultActions = [
    { label: 'Show movies', value: 'show movies' },
    { label: 'Book a movie', value: 'book a movie' },
    { label: 'My bookings', value: 'my bookings' },
    { label: 'Cancel booking', value: 'cancel booking' },
  ];

  const openBooking = (movie) => {
    setActive(movie.id);
    setSeats(2);
    setDate(today());
    setTime('06:30 PM');
    document.getElementById('booking')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const createBooking = async (movieId = active, options = {}) => {
    setNotice('');
    try {
      const d = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          movieId,
          date: options.date || date,
          time: options.time || time,
          seats: Number(options.seats ?? seats),
          customer: 'Movie fan',
        }),
      });
      setBookings((a) => [d.booking, ...a]);
      setNotice(`Booking confirmed: ${d.booking.code}`);
      say(`Booked ${d.booking.movieTitle} for ${d.booking.date} at ${d.booking.time}. Confirmation: ${d.booking.code}`, defaultActions);
    } catch (e) {
      say(e.message, defaultActions);
    }
  };

  const cancelBooking = async (id) => {
    try {
      await api(`/api/bookings/${id}`, { method: 'DELETE' });
      setBookings((a) => a.filter((b) => b.id !== id));
      return true;
    } catch (e) {
      say(e.message);
      return false;
    }
  };

  const dateActions = [
    { label: 'Today', value: 'date:today' },
    { label: 'Tomorrow', value: 'date:tomorrow' },
    { label: 'Pick a date', type: 'date' },
  ];

  const startBooking = (movie = null) => {
    setChatMovie(movie);
    setChatDraft(movie ? { movieId: movie.id } : null);
    if (movie) {
      setStep('date');
      say(`Let’s book ${movie.title}. Choose a date:`, dateActions);
    } else {
      setStep('movie');
      say('Which movie would you like?', movies.map((m) => ({ label: m.title, value: `movie:${m.id}` })));
    }
  };

  const startCancel = () => {
    if (!bookings.length) {
      say('You have no bookings to cancel.', defaultActions);
      return;
    }
    setStep('cancel-booking');
    say('Choose which booking to cancel:', bookings.map((b) => ({ label: `${b.movieTitle} • ${b.date} • ${b.code}`, value: `cancel-select:${b.id}` })));
  };

  const handleChat = async (raw = input) => {
    const text = raw.trim();
    if (!text) return;
    setMessages((a) => [...a, { from: 'user', text }]);
    setInput('');

    const low = text.toLowerCase();
    if (low.startsWith('theme:')) {
      const mode = low.slice(6);
      setTheme(mode);
      say(`Theme set to ${mode === 'auto' ? 'Auto' : mode === 'light' ? 'Day' : 'Night'} mode.`, defaultActions);
      return;
    }
    if (low === 'restart') {
      startBooking();
      return;
    }
    if (/\b(day mode|light mode)\b/.test(low)) {
      setTheme('light');
      say('Day mode is on.', defaultActions);
      return;
    }
    if (/\b(night mode|dark mode)\b/.test(low)) {
      setTheme('dark');
      say('Night mode is on.', defaultActions);
      return;
    }
    if (/\b(help|what can you do)\b/.test(low)) {
      say('Tap a button below to browse, book, view or cancel bookings. You can also switch to day, night, or automatic theme.', defaultActions);
      return;
    }
    if (/\b(recommend|recommendation|suggest|surprise me|pick for me)\b/.test(low)) {
      const genre = genres.find((g) => g !== 'All films' && low.includes(g.toLowerCase()));
      const choices = (genre ? movies.filter((m) => m.genre.toLowerCase().includes(genre.toLowerCase())) : movies).slice().sort((a, b) => Number(b.rating) - Number(a.rating));
      if (choices.length) {
        const movie = choices[0];
        say(`${genre ? `For ${genre.toLowerCase()}, ` : ''}I recommend ${movie.title} (${movie.rating}/10). ${movie.genre} · ${movie.duration} minutes. Want to book it?`, [{ label: 'Book it', value: `book:${movie.id}` }, { label: 'Another idea', value: 'recommend' }]);
      }
      return;
    }
    if (step === 'movie') {
      const movie = low.startsWith('movie:') ? movies.find((m) => m.id === low.slice(6)) : movies.find((m) => m.title.toLowerCase().includes(low) || low.includes(m.title.toLowerCase()));
      if (!movie) {
        say('I did not catch that title. Pick a movie from the list or type it in.', movies.map((m) => ({ label: m.title, value: `movie:${m.id}` })));
        return;
      }
      setChatMovie(movie);
      setChatDraft({ movieId: movie.id });
      setStep('date');
      say(`Let’s book ${movie.title}. Choose a date:`, dateActions);
      return;
    }
    if (step === 'date') {
      let chosen = null;
      if (low.startsWith('date:')) {
        const requested = low.slice(5);
        if (requested === 'today') chosen = today();
        else if (requested === 'tomorrow') {
          const d = new Date();
          d.setDate(d.getDate() + 1);
          chosen = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        }
      }
      if (!chosen) {
        const match = text.match(/\d{4}-\d{2}-\d{2}/);
        chosen = match ? match[0] : null;
      }
      if (!chosen) {
        say('Choose a date for the booking.', dateActions);
        return;
      }
      setChatDraft((d) => ({ ...d, date: chosen }));
      setStep('time');
      say('Pick a showtime:', showtimes.map((t) => ({ label: t, value: `time:${t}` })));
      return;
    }
    if (step === 'time') {
      const selectedTime = low.startsWith('time:') ? text.slice(5) : showtimes.find((t) => low.includes(t.toLowerCase()));
      if (!selectedTime) {
        say('Tap a showtime:', showtimes.map((t) => ({ label: t, value: `time:${t}` })));
        return;
      }
      setChatDraft((d) => ({ ...d, time: selectedTime }));
      setStep('seats');
      say('How many seats do you want? Choose 1–8.', Array.from({ length: 8 }, (_, i) => ({ label: `${i + 1} seat${i > 0 ? 's' : ''}`, value: `seats:${i + 1}` })));
      return;
    }
    if (step === 'seats') {
      const count = low.startsWith('seats:') ? Number(low.slice(6)) : Number(text.match(/\d+/)?.[0]);
      if (!Number.isInteger(count) || count < 1 || count > 8) {
        say('Choose from 1 to 8 seats:', Array.from({ length: 8 }, (_, i) => ({ label: `${i + 1} seat${i > 0 ? 's' : ''}`, value: `seats:${i + 1}` })));
        return;
      }
      setChatDraft((d) => ({ ...d, seats: count }));
      setStep('confirm');
      say(`Ready to confirm ${chatMovie?.title || 'your movie'} on ${low.startsWith('seats:') ? chatDraft?.date : chatDraft?.date} at ${chatDraft?.time}?`, [{ label: 'Confirm booking', value: 'confirm' }, { label: 'Start over', value: 'restart' }]);
      return;
    }
    if (step === 'confirm') {
      if (low === 'confirm') {
        try {
          if (!chatMovie || !chatDraft?.movieId || !chatDraft.date || !chatDraft.time || !chatDraft.seats) throw Error('Booking details are incomplete.');
          await createBooking(chatDraft.movieId, { date: chatDraft.date, time: chatDraft.time, seats: chatDraft.seats });
          setStep('');
          setChatMovie(null);
          setChatDraft(null);
          return;
        } catch (error) {
          say(error.message, defaultActions);
          return;
        }
      }
      if (low === 'restart') {
        startBooking();
        return;
      }
    }
    if (step === 'cancel-booking') {
      const id = low.startsWith('cancel-select:') ? text.slice('cancel-select:'.length) : null;
      const booking = bookings.find((b) => b.id === id);
      if (!booking) {
        say('Tap the booking you want to cancel:', bookings.map((b) => ({ label: `${b.movieTitle} • ${b.date} • ${b.code}`, value: `cancel-select:${b.id}` })));
        return;
      }
      setCancelTarget(booking);
      setStep('cancel-confirm');
      say(`Cancel ${booking.movieTitle} booking ${booking.code}?`, [{ label: 'Yes, cancel it', value: 'cancel-yes' }, { label: 'No', value: 'cancel-no' }]);
      return;
    }
    if (step === 'cancel-confirm') {
      if (low === 'cancel-yes' && cancelTarget) {
        const ok = await cancelBooking(cancelTarget.id);
        if (ok) {
          say(`Cancelled ${cancelTarget.movieTitle} booking (${cancelTarget.code}).`, defaultActions);
          setCancelTarget(null);
          setStep('');
          return;
        }
      }
      if (low === 'cancel-no') {
        setCancelTarget(null);
        setStep('');
        say('No problem. I can help with something else.', defaultActions);
        return;
      }
    }

    if (/\b(show|browse|list|find)\b/.test(low) && /movie|film|cinema|all/.test(low)) {
      document.getElementById('movies')?.scrollIntoView({ behavior: 'smooth' });
      say('Choose a movie to see details or start booking.', defaultActions);
      return;
    }
    if (low.startsWith('book:')) {
      const movie = movies.find((m) => m.id === low.slice(5));
      if (movie) {
        startBooking(movie);
        return;
      }
    }
    if (/\b(my bookings|my tickets|booking history|show bookings)\b/.test(low)) {
      document.getElementById('my-bookings')?.scrollIntoView({ behavior: 'smooth' });
      say(bookings.length ? `You have ${bookings.length} bookings. Choose one to cancel.` : 'You have no bookings yet.', defaultActions);
      return;
    }
    if (/\bcancel\b/.test(low)) {
      startCancel();
      return;
    }
    if (/\b(book|reserve|tickets?)\b/.test(low)) {
      const movie = movies.find((m) => low.includes(m.title.toLowerCase()));
      startBooking(movie || null);
      return;
    }
    if (/\b(hello|hi|hey)\b/.test(low)) {
      say('Hi! What kind of movie night are you planning? I can recommend something, find a genre, or help with a booking.', [{ label: 'Recommend a film', value: 'recommend' }, { label: 'Show movies', value: 'show movies' }]);
      return;
    }

    say(`I’m not sure I understood “${text}”. You can ask for a film recommendation, name a movie or genre, or tell me to book, show, or cancel a booking.`, defaultActions);
  };

  const selected = movies.find((m) => m.id === active);

  return (
    <div className="app-shell min-h-screen" data-theme={activeTheme}>
      <header className="topbar">
        <a className="brand" href="#top"><span className="brand-mark"><Clapperboard size={20}/></span><span>CINEMA<span className="brand-soft">BUDDY</span></span></a>
        <nav>
          <a href="#movies">Movies</a>
          <a href="#booking">Booking</a>
          <a href="#my-bookings">Bookings</a>
        </nav>
        <div className="theme-picker">
          <Monitor size={12} />
          <select value={theme} onChange={(e) => setTheme(e.target.value)}>
            <option value="auto">Auto</option>
            <option value="light">Day</option>
            <option value="dark">Night</option>
          </select>
        </div>
      </header>
      <main id="top">
        <section className="hero">
          <div className="hero-grain" />
          <div className="hero-copy">
            <div className="eyebrow"><span className="live-dot" /> YOUR NEXT GREAT NIGHT OUT</div>
            <h1>Good films. Easy bookings.</h1>
            <p>Browse the lineup, choose a show, and let the built-in movie buddy help you lock in the plan.</p>
            <div className="hero-actions">
              <button className="primary-btn" onClick={() => document.getElementById('movies')?.scrollIntoView({ behavior: 'smooth' })}>Browse now</button>
              <button className="secondary-btn" onClick={() => setChatOpen(true)}>Ask the buddy</button>
            </div>
            <div className="hero-proof">
              <span>Now showing</span>
              <div className="proof-divider" />
              <span>Curated picks</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="orbit" />
            <div className="showing-badge">LIVE • 4K • Dolby</div>
          </div>
        </section>

        <section id="movies" className="catalog section-wrap">
          <div className="section-head">
            <div>
              <div className="eyebrow">THE GOOD STUFF</div>
              <h2>Now showing<span className="lime-dot">.</span></h2>
            </div>
            <div className="filters">
              {genres.map((genre) => (
                <button key={genre} className={`filter ${filter === genre ? 'active' : ''}`} onClick={() => setFilter(genre)}>{genre}</button>
              ))}
            </div>
          </div>

          <div className="movie-grid">
            {visible.map((movie) => (
              <article key={movie.id} className="movie-card" onClick={() => openBooking(movie)}>
                <div className="movie-image" style={{ background: movie.color }}><div className="movie-overlay" /></div>
                <div className="movie-content">
                  <div className="movie-topline">
                    <span className="movie-title">{movie.title}</span>
                    <span className="rating"><Star size={12} fill="currentColor" /> {movie.rating}</span>
                  </div>
                  <div className="movie-meta">{movie.genre} • {movie.duration} min</div>
                  <div className="movie-bottom">
                    <span className="meta-price">₹{movie.price}</span>
                    <button className="small-btn" onClick={(e) => { e.stopPropagation(); openBooking(movie); }}>Book</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="how section-wrap">
          <div className="how-inner">
            <div>
              <div className="eyebrow">MADE EASY</div>
              <h2>Your night out,<br/><em>three little steps.</em></h2>
            </div>
            <div className="steps">
              <div className="step"><small>01</small><div><h3>Pick a film</h3><p>Browse by mood or choose a favorite.</p></div></div>
              <div className="step"><small>02</small><div><h3>Choose your show</h3><p>Select the date, time, and seat count.</p></div></div>
              <div className="step"><small>03</small><div><h3>Confirm</h3><p>Your booking is ready in seconds.</p></div></div>
            </div>
          </div>
        </section>

        <section id="booking" className="booking section-wrap">
          {selected && (
            <div className="booking-panel">
              <div className="booking-title">
                <div>
                  <div className="eyebrow">MAKE IT A MOVIE NIGHT</div>
                  <h2>{selected.title}</h2>
                </div>
                <div className="booking-price">₹{selected.price}</div>
              </div>

              <div className="booking-fields">
                <label>
                  Date
                  <input type="date" value={date} min={today()} onChange={(e) => setDate(e.target.value)} />
                </label>
                <label>
                  Showtime
                  <select value={time} onChange={(e) => setTime(e.target.value)}>
                    {showtimes.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
                  </select>
                </label>
                <div className="seat-control">
                  <span>Seats</span>
                  <button onClick={() => setSeats((v) => Math.max(1, v - 1))}><Minus size={15} /></button>
                  <span>{seats}</span>
                  <button onClick={() => setSeats((v) => Math.min(8, v + 1))}><Plus size={15} /></button>
                </div>
              </div>

              <div className="booking-bottom">
                <span>Total <b>₹{selected.price * seats}</b></span>
                <button className="primary-btn" onClick={() => createBooking()}>Confirm booking</button>
              </div>

              <div className="demand-note">
                <Sparkles size={15} />
                <span>
                  {demand ? `Demand forecast: ${demand.predicted_bookings} bookings (${demand.high_demand_probability * 100}% chance of high demand)` : 'Forecast loading…'}
                </span>
              </div>
            </div>
          )}
        </section>

        <section id="my-bookings" className="bookings section-wrap">
          <div className="section-head compact">
            <div>
              <div className="eyebrow">YOUR PLANS</div>
              <h2>My bookings<span className="lime-dot">.</span></h2>
            </div>
          </div>
          <div className="booking-list">
            {bookings.length ? bookings.map((booking) => (
              <div key={booking.id} className="booking-row">
                <div className="ticket-details">
                  <div className="ticket-title">{booking.movieTitle}</div>
                  <span>{booking.date} • {booking.time}</span>
                  <span>{booking.seats} seats • {booking.code}</span>
                </div>
                <div className="ticket-total">₹{booking.total}</div>
                <button className="cancel-btn" onClick={() => cancelBooking(booking.id)}>Cancel</button>
              </div>
            )) : <div className="empty-bookings"><Ticket size={18} /><p>No bookings yet. Pick a movie and lock it in.</p></div>}
          </div>
        </section>
      </main>

      <footer>
        <a className="brand" href="#top"><span className="brand-mark"><Clapperboard size={17}/></span><span>CINEMA<span className="brand-soft">BUDDY</span></span></a>
        <span>A little more fun, a little less friction.</span>
      </footer>

      <aside className={`chat-widget ${chatOpen ? 'open' : ''}`}>
        <button className="chat-tab" onClick={() => setChatOpen((v) => !v)}>
          <span className="bot-avatar"><Bot size={19}/></span>
          <span>Movie buddy <small>Online</small></span>
          <ChevronDown size={16} className="chevron" />
        </button>

        {chatOpen && (
          <div className="chat-panel">
            <div className="chat-body">
              {messages.map((msg, index) => (
                <div key={`${msg.from}-${index}`} className={`message ${msg.from}`}>
                  <div className="message-text">{msg.text}</div>
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="message-actions">
                      {msg.actions.map((action) => (
                        <button key={action.label} className="chat-choice" onClick={() => handleChat(action.value || action.label)}>{action.label}</button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div ref={chatEnd} />
            </div>
            <form className="chat-form" onSubmit={(e) => { e.preventDefault(); handleChat(); }}>
              <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask for a movie, date, or booking…" />
              <button type="submit"><Send size={15} /></button>
            </form>
          </div>
        )}
      </aside>
    </div>
  );
}
