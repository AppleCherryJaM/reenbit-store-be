export const port = parseInt(process.env.PORT || '5002', 10);

export const getCorsConfig = () => {
  // Определяем разрешенные источники
  const allowedOrigins: string[] = [];

  // Добавляем FE_API_URL если указан
  if (process.env.FE_API_URL) {
    const urls = process.env.FE_API_URL.split(',');
    allowedOrigins.push(...urls);
  }

  // В development добавляем localhost
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins.push(
      'http://localhost:5173',
      'http://localhost:3000',
      'http://localhost:3001',
    );
  }

  // Если в production не указаны origins, разрешаем все (только для тестирования)
  if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
    console.warn('No CORS origins specified in production, allowing all');
    return {
      origin: true, // Разрешаем все в production для тестирования
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    };
  }

  return {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Разрешаем запросы без origin (например, от Postman, curl, мобильных приложений)
      if (!origin) {
        return callback(null, true);
      }

      // Проверяем есть ли origin в разрешенных
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Для production логируем заблокированные запросы
      if (process.env.NODE_ENV === 'production') {
        console.warn(`CORS blocked: ${origin}. Allowed: ${allowedOrigins.join(', ')}`);
      }

      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 86400,
  };
};

// Для обратной совместимости
export const corsConfig = getCorsConfig();