import * as Sentry from '@sentry/react'

if (inject) {
  const {
    VERSION,
    CUSTOM,
    SENTRY_DSN,
    SENTRY_TRACES_SAMPLE_RATE,
    DEVELOPMENT,
    SENTRY_DEBUG,
  } = inject

  Sentry.init({
    dsn:
      SENTRY_DSN ||
      'https://c40dad799323428f83aee04391639345@o1096501.ingest.sentry.io/6117162',
    integrations: [
      new Sentry.BrowserTracing({
        tracePropagationTargets: ['localhost', /^\//, 'graphql'],
        idleTimeout: 10000,
      }),
    ],
    tracesSampleRate: SENTRY_TRACES_SAMPLE_RATE
      ? +SENTRY_TRACES_SAMPLE_RATE
      : 0.1,
    release: VERSION,
    environment: DEVELOPMENT ? 'development' : 'production',
    debug: SENTRY_DEBUG,
    beforeSend: async (event) => {
      const errors = event.exception.values
      const isLibrary = errors.find((e) => e?.value?.includes('vendor'))
      const fetchError = errors.find((e) => e?.value?.includes('<'))

      if (!isLibrary) {
        const error = errors[0]
          ? `${errors[0].type}: ${errors[0].value}`
          : 'Unknown error'
        await fetch('/api/error/client', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            version: VERSION,
          },
          body: JSON.stringify({ error }),
        })
      }
      return CUSTOM || isLibrary || fetchError ? null : event
    },
  })
}
