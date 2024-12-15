![tune-art](./public/favicon.svg)

# Tune Art

## Development

- Install dependencies:

```sh
npm install
```

- Start dev server:

```sh
npm run start
```

### Database

- Generate a database migration file and apply it to the database:

```sh
npx prisma migrate dev
```

- Push the Prisma schema state to the database:

```sh
npx prisma db push
```

- Update the Prisma client library:

```sh
npx prisma generate
```

- Seed the database with initial data:

```sh
npx prisma db seed
```

## License

MIT
