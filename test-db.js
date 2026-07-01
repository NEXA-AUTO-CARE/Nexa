const { DataSource } = require('typeorm');
const ds = new DataSource({
  type: 'postgres',
  url: 'postgresql://postgres:postgres@localhost:5432/nexa',
  entities: ['apps/api/src/database/entities/*.ts'],
});
ds.initialize().then(async () => {
  const users = await ds.query('SELECT * FROM users');
  console.log(users);
  process.exit(0);
}).catch(console.error);
