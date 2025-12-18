import { EventSchemas, Inngest } from "inngest";
import { TestEvent } from "./functions/test";

type Events = TestEvent;

export const inngest = new Inngest({
  id: "zanin.ai",
  schemas: new EventSchemas().fromRecord<Events>(),
});
