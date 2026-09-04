import { defineNitroConfig } from 'nitro/config'

export default defineNitroConfig({
  server: {
    host: process.env.HOST ?? '0.0.0.0',
    port: process.env.PORT ? Number(process.env.PORT) : 3000,
  },
})
