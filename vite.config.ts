import { defineConfig } from 'vitest/config';
export default defineConfig({test:{include:['tests/**/*.test.ts']},server:{port:5173,strictPort:true},build:{target:'safari16'}});
