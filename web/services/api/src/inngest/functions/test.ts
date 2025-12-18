import { inngest } from "../client";

type UserSignup = {
  data: {
    email: string;
    name: string;
  };
};

export type TestEvent = {
  "user/new.signup": UserSignup;
};

export default inngest.createFunction(
  { id: "import-product-images" },
  { event: "user/new.signup" },
  async ({ event, step }) => {
    console.log("Function called", event);
  },
);
