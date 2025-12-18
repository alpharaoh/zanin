import { app } from "./app";

const port = process.env.PORT || 8081;

app.listen(port, () =>
  console.log(`Zanin API listening at http://localhost:${port}`),
);
