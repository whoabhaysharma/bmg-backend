import { config } from 'dotenv';

export default async () => {
  config({ path: '.env' });
};
