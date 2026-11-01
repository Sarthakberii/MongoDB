# Cinema Buddy

The project has two main folders: `frontend` for the website and `backend` for the API and machine-learning service. You can start the frontend and Node.js backend with `npm run dev` in their own terminals.

```text
frontend/
  src/                 React pages and styles
  package.json         Frontend commands and packages
backend/
  server.js            Express server entry point
  config/database.js   MongoDB connection
  models/              Movie and booking data access
  controllers/         API request logic
  routes/              API URL definitions
  ml-service/          Python, PyMongo, and scikit-learn service
PROJECT_REPORT.md
Cinema_Buddy_Project_Report.docx
```

## Before you start

Install Node.js 20 or newer, Python 3.10 or newer, and MongoDB. Start MongoDB on `localhost:27017`. The backend reads optional settings from `backend/.env`; copy `backend/.env.example` to that filename to change them.

## Run the application

Open three terminal windows from the project folder.

### Terminal 1: Node.js backend

```bash
cd backend
npm install
npm run dev
```

The Express API starts at `http://localhost:4000`.

### Terminal 2: Machine-learning service

```bash
cd backend/ml-service
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

On Windows PowerShell, activate with `.venv\Scripts\Activate.ps1`. The ML API starts at `http://localhost:5001`.

### Terminal 3: React frontend

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL shown in the terminal, usually `http://localhost:5173`.

## What is in the backend?

- `server.js` starts Express and connects the application routes.
- `models/movieModel.js` and `models/bookingModel.js` read and save MongoDB data.
- `controllers/` contains the API logic for movies, bookings, and demand estimates.
- `routes/` maps API URLs to those controllers.
- `ml-service/model.py` trains Random Forest models; `ml-service/app.py` serves estimates using Flask and PyMongo.

## Website features

- Browse and filter movies, book 1–8 seats, review or cancel bookings.
- Use the Movie Buddy buttons to choose a movie, date, showtime, seats, and confirm a booking. Typing is optional.
- Change the appearance using Auto, Day, or Night mode. Auto follows your device preference.
- View the ML demand estimate in the booking panel.

The chat helper uses built-in intent matching and does not need an external AI key. It can recommend a highly rated film, find a movie by title or genre, and guide booking and cancellation with reply-specific choices. The ML service uses synthetic training data for a demonstration; its estimates are not real cinema forecasts. If MongoDB is unavailable, the Node API temporarily keeps bookings in memory.

## Useful ML URLs

- `http://localhost:5001/health` — service status
- `http://localhost:5001/metrics` — Accuracy, R², MAE, precision, recall, and F1
- `http://localhost:5001/predict?movie_id=orbit&day_of_week=5&show_hour=18` — example prediction
