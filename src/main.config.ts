export const port = parseInt(process.env.PORT || '5002', 10);

export const getCorsConfig = () => {
  const allowedOrigins: string[] = [];

  if (process.env.ALLOWED_ORIGINS) {
    if (process.env.ALLOWED_ORIGINS === '*') {
      // Если стоит * - разрешаем всё
      console.log('🌐 CORS: Allowing ALL origins (*)');
      return {
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
        exposedHeaders: ['Authorization'],
        maxAge: 86400,
      };
    }
    
    // Разбираем список origins
    const urls = process.env.ALLOWED_ORIGINS.split(',')
      .map(url => url.trim())
      .filter(url => url.length > 0);
    
    allowedOrigins.push(...urls);
  }

  console.log('🌐 Allowed CORS origins:', allowedOrigins);

  // Если origins не указаны, разрешаем по умолчанию
  if (allowedOrigins.length === 0) {
    allowedOrigins.push(
      'https://reenbit-store-fe.netlify.app',
      'http://localhost:5173',
      'https://reenbit-store-be.onrender.com'
    );
  }

  return {
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Authorization'],
    maxAge: 86400,
  };
};

// Для обратной совместимости
export const corsConfig = getCorsConfig();
