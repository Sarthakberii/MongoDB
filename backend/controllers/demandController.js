export async function getDemand(req, res) {
  const url = new URL('/predict', process.env.ML_SERVICE_URL || 'http://localhost:5001');
  for (const key of ['movie_id', 'day_of_week', 'show_hour']) {
    if (req.query[key] !== undefined) url.searchParams.set(key, req.query[key]);
  }
  try {
    const response = await fetch(url);
    const body = await response.json();
    res.status(response.status).json(body);
  } catch {
    res.status(503).json({ error: 'ML service is unavailable. Start it from backend/ml-service.' });
  }
}
