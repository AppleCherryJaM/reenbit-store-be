/* eslint-disable @typescript-eslint/no-unsafe-call */
export const port = process.env.PORT || 5002;

export const corsConfig = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      process.env.FE_API_URL, 
      'http://localhost:5173',
    ].filter(Boolean) as string[];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
};
