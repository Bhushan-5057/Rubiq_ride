import dotenv from 'dotenv';
import { connectDB } from './config/dbConnect.js';
import { seedAdmin } from './scripts/seedAdmin.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index.js';

dotenv.config();

const PORT = process.env.PORT;

const app = express();

app.use(
  cors({origin: (origin, callback) => callback(null, origin),
    credentials: true,
  })
);
app.use(helmet());
app.use(express.json());

app.use('/api', routes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});
 app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Internal Server Error' });
});

async function start() {
  try {
    await connectDB();
    app.listen(PORT, async () => {
      console.log(`Server is running on port ${PORT}`);

      try {
        await seedAdmin();
        console.log('Admin account verification completed successfully.');
      } catch (err) {
        console.error('Admin account initialization failed:', err.message || err);
      }
    });
  } catch (err) {
    console.error('Failed to start the server:', err);
    process.exit(1);
  }
}
start();
