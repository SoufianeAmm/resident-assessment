require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const activitiesRoutes = require('./routes/activities');
const assessmentsRoutes = require('./routes/assessments');
const recommendationsRoutes = require('./routes/recommendations');
const residentsRoutes = require('./routes/residents');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/activities', activitiesRoutes);
app.use('/api/assessments', assessmentsRoutes);
app.use('/api/recommendations', recommendationsRoutes);
app.use('/api/residents', residentsRoutes);

app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Life Enrichment Assessment Server running on port ${PORT}`);
});
