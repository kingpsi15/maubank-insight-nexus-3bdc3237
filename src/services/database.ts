
// Mock database service for DatabaseInitializer
export const initializeDatabase = async () => {
  console.log('Database initialization - using Supabase instead');
  return Promise.resolve();
};

export const seedInitialData = async () => {
  console.log('Seeding initial data - using Supabase instead');
  return Promise.resolve();
};
