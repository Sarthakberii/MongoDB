import os
from datetime import datetime, timezone

import pandas as pd
from flask import Flask, jsonify, request
from pymongo import MongoClient
from model import train_and_evaluate

app = Flask(__name__)
regressor = classifier = metrics = None
mongo = MongoClient(os.getenv('MONGODB_URI', 'mongodb://localhost:27017'), serverSelectionTimeoutMS=2500)
db = None
try:
    mongo.admin.command('ping')
    db = mongo[os.getenv('DB_NAME', 'cinema_buddy')]
    print('ML service connected to MongoDB')
except Exception as exc:
    print(f'MongoDB unavailable to ML service: {exc}')

def ensure_models():
    global regressor, classifier, metrics
    if regressor is None:
        regressor, classifier, metrics = train_and_evaluate()
        if db is not None:
            db.ml_metrics.update_one({'model_version': 'rf-demand-v1'}, {'$set': {**metrics, 'model_version': 'rf-demand-v1', 'updated_at': datetime.now(timezone.utc)}}, upsert=True)
    return regressor, classifier, metrics

@app.get('/health')
def health():
    ensure_models()
    return jsonify({'ok': True, 'database': db is not None, 'model': 'RandomForestRegressor + RandomForestClassifier'})

@app.get('/metrics')
def get_metrics():
    _, _, result = ensure_models()
    return jsonify(result)

@app.get('/predict')
def predict():
    reg, clf, _ = ensure_models()
    movie = request.args.get('movie_id', 'orbit')
    day = request.args.get('day_of_week', 5, type=int)
    hour = request.args.get('show_hour', 18, type=int)
    if movie not in {'orbit', 'midnight', 'wild', 'laugh', 'deepblue', 'lastlight'} or day not in range(7) or hour not in {12,15,18,21}:
        return jsonify({'error': 'Use a supported movie, day 0–6, and show hour 12, 15, 18, or 21.'}), 400
    row = {'movie_id': movie, 'day_of_week': day, 'show_hour': hour}
    row_df = pd.DataFrame([row], columns=['movie_id', 'day_of_week', 'show_hour'])
    estimate = max(0, int(round(float(reg.predict(row_df)[0]))))
    probability = float(clf.predict_proba(row_df)[0][1])
    answer = {'movie_id': movie, 'day_of_week': day, 'show_hour': hour, 'predicted_bookings': estimate, 'high_demand_probability': round(probability, 3), 'demand_label': 'high' if probability >= .5 else 'low'}
    if db is not None:
        db.demand_predictions.insert_one({**answer, 'created_at': datetime.now(timezone.utc)})
    return jsonify(answer)

if __name__ == '__main__':
    ensure_models()
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5001)))
