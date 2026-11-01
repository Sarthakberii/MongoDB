"""Reproducible movie-demand dataset and random-forest model evaluation."""
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, precision_score, r2_score, recall_score
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

ROOT = Path(__file__).parent
DATA_PATH = ROOT / 'data' / 'movie_demand.csv'
FEATURES = ['movie_id', 'day_of_week', 'show_hour']

def build_dataset():
    """Create 1,200 deterministic, synthetic showtime observations."""
    rng = np.random.default_rng(27)
    rows = []
    popularity = {'orbit': 27, 'midnight': 15, 'wild': 9, 'laugh': 21, 'deepblue': 12, 'lastlight': 7}
    for _ in range(1200):
        movie = str(rng.choice(list(popularity)))
        day = int(rng.integers(0, 7))
        hour = int(rng.choice([12, 15, 18, 21], p=[.12, .22, .42, .24]))
        weekend = day in (5, 6)
        evening = hour >= 18
        demand = 24 + popularity[movie] + (18 if weekend else 0) + (23 if evening else 0) + (6 if hour == 18 else 0) + rng.normal(0, 9)
        bookings = max(4, int(round(demand)))
        rows.append({'movie_id': movie, 'day_of_week': day, 'show_hour': hour, 'bookings': bookings, 'high_demand': int(bookings >= 75)})
    df = pd.DataFrame(rows)
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(DATA_PATH, index=False)
    return df

def train_and_evaluate():
    data = build_dataset()
    X = data[FEATURES]
    y_reg, y_class = data['bookings'], data['high_demand']
    X_train, X_test, yr_train, yr_test, yc_train, yc_test = train_test_split(X, y_reg, y_class, test_size=.2, random_state=42, stratify=y_class)
    categorical = ['movie_id']
    numeric = ['day_of_week', 'show_hour']
    def preprocessing():
        return ColumnTransformer([('movie', OneHotEncoder(handle_unknown='ignore'), categorical), ('numeric', 'passthrough', numeric)])
    reg = Pipeline([('features', preprocessing()), ('model', RandomForestRegressor(n_estimators=180, min_samples_leaf=2, random_state=42, n_jobs=-1))])
    clf = Pipeline([('features', preprocessing()), ('model', RandomForestClassifier(n_estimators=180, min_samples_leaf=2, class_weight='balanced', random_state=42, n_jobs=-1))])
    reg.fit(X_train, yr_train); clf.fit(X_train, yc_train)
    pred = reg.predict(X_test); classes = clf.predict(X_test)
    metrics = {
        'dataset_rows': int(len(data)), 'train_rows': int(len(X_train)), 'test_rows': int(len(X_test)), 'random_state': 42,
        'regression': {'r2_score': round(float(r2_score(yr_test, pred)), 4), 'mae': round(float(mean_absolute_error(yr_test, pred)), 4)},
        'classification': {'accuracy': round(float(accuracy_score(yc_test, classes)), 4), 'precision': round(float(precision_score(yc_test, classes, zero_division=0)), 4), 'recall': round(float(recall_score(yc_test, classes, zero_division=0)), 4), 'f1_score': round(float(f1_score(yc_test, classes, zero_division=0)), 4)},
        'target_definition': 'high_demand = 1 when bookings >= 75',
        'data_note': 'All observations are synthetic and generated from a seeded toy demand formula; metrics demonstrate the pipeline and are not real cinema forecasts.'
    }
    return reg, clf, metrics
