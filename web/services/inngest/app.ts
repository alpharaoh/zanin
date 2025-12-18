import { Inngest } from "inngest";
import { connect } from "inngest/connect";

const inngest = new Inngest({
  id: "my-app",
  appVersion: process.env.RENDER_GIT_COMMIT,
});

const handleSignupFunction = inngest.createFunction(
  { id: "handle-signup" },
  { event: "user.created" },
  async ({ event, step }) => {
    console.log("Function called", event);
  },
);

(async () => {
  const connection = await connect({
    apps: [
      {
        client: inngest,
        functions: [handleSignupFunction],
      },
    ],
    maxWorkerConcurrency: 10,
  });

  console.log("Worker: connected", connection);
})();
