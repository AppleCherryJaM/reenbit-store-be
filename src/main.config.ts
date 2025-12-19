export const apiUrl = process.env.FE_API_URL || '';
export const port = process.env.PORT || 5002;

export const corsConfig = {
  origin: [apiUrl, 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
  credentials: true,
};
