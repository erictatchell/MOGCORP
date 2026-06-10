# Firebase Functions

Firebase Hosting routes `/api/**` to the `api` HTTPS function so the vault
password and `vault_access` cookie are checked server-side.

Before deploying, set the vault password secret:

```sh
firebase functions:secrets:set VAULT_PASSWORD
```

Public Firebase client config can be overridden with function environment
variables such as `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`,
`FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_APP_ID`,
`ADMIN_EMAILS`, and the collection names.
