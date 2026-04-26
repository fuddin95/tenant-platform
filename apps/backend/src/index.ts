import { createApp } from './server';

const PORT = process.env['PORT'] ?? 3001;

const app = createApp();

app.listen(PORT, () => {
  console.warn(`Backend listening on port ${PORT}`);
});
