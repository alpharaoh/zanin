import { inngest } from "../client";

export default inngest.createFunction(
  { id: "import-product-images" },
  { event: "shop/product.imported" },
  async ({ event, step }) => {
    console.log("Function called", event);
  },
);
