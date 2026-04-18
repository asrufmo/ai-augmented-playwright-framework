import * as dotenv from 'dotenv';

dotenv.config();

export interface Environment {
  name: string;
  baseURL: string;
  apiBaseURL: string;
  credentials: {
    email: string;
    password: string;
  };
  adminCredentials: {
    email: string;
    password: string;
  };
}

const environments: Record<string, Environment> = {
  local: {
    name: 'local',
    baseURL: 'http://localhost:3000',
    apiBaseURL: 'http://localhost:3000/api',
    credentials: {
      email: process.env.TEST_USER_EMAIL ?? 'test@example.com',
      password: process.env.TEST_USER_PASSWORD ?? 'Test1234!',
    },
    adminCredentials: {
      email: process.env.ADMIN_USER_EMAIL ?? 'admin@example.com',
      password: process.env.ADMIN_USER_PASSWORD ?? 'Admin1234!',
    },
  },
  staging: {
    name: 'staging',
    baseURL: 'https://staging.example.com',
    apiBaseURL: 'https://staging.example.com/api',
    credentials: {
      email: process.env.TEST_USER_EMAIL ?? '',
      password: process.env.TEST_USER_PASSWORD ?? '',
    },
    adminCredentials: {
      email: process.env.ADMIN_USER_EMAIL ?? '',
      password: process.env.ADMIN_USER_PASSWORD ?? '',
    },
  },
  production: {
    name: 'production',
    baseURL: 'https://app.example.com',
    apiBaseURL: 'https://app.example.com/api',
    credentials: {
      email: process.env.TEST_USER_EMAIL ?? '',
      password: process.env.TEST_USER_PASSWORD ?? '',
    },
    adminCredentials: {
      email: process.env.ADMIN_USER_EMAIL ?? '',
      password: process.env.ADMIN_USER_PASSWORD ?? '',
    },
  },
};

export const Env = {
  current(): Environment {
    const key = (process.env.ENVIRONMENT ?? 'local').toLowerCase();
    const env = environments[key];
    if (!env) throw new Error(`Unknown environment: "${key}". Valid: ${Object.keys(environments).join(', ')}`);
    return env;
  },
  get(name: string): Environment {
    const env = environments[name];
    if (!env) throw new Error(`Unknown environment: "${name}"`);
    return env;
  },
};
