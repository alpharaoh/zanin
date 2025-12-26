import { inngest } from "../../client";
import { NonRetriableError } from "inngest";
import { listChatMessages } from "@zanin/db/queries/select/many/listChatMessages";
import { selectChatThread } from "@zanin/db/queries/select/one/selectChatThread";
import { updateChatThread } from "@zanin/db/queries/update/updateChatThread";
import { SimpleLLMService } from "../../../services/external/llm/simple";
import { z } from "zod";

type GenerateChatTitleData = {
  data: {
    threadId: string;
    organizationId: string;
  };
};

export type GenerateChatTitleEvent = {
  "chat/generate-title": GenerateChatTitleData;
};

export const generateChatTitle = inngest.createFunction(
  {
    id: "generate-chat-title",
    concurrency: 2,
    retries: 2,
  },
  { event: "chat/generate-title" },
  async ({ event, step, logger }) => {
    const { threadId, organizationId } = event.data;

    const thread = await step.run("get-thread", async () => {
      return await selectChatThread(threadId, organizationId);
    });

    if (!thread) {
      throw new NonRetriableError("Thread not found");
    }

    if (thread.title) {
      logger.info("Thread already has a title, skipping");
      return { skipped: true, reason: "already_has_title" };
    }

    const messages = await step.run("get-messages", async () => {
      const result = await listChatMessages(
        { threadId },
        { createdAt: "asc" },
        10,
      );
      return result.data;
    });

    if (messages.length === 0) {
      throw new NonRetriableError("No messages in thread");
    }

    const messageText = messages
      .map((m) => `${m.role}: ${m.content}`)
      .join("\n\n");

    const result = await step.run("generate-title", async () => {
      return await SimpleLLMService.generateObject({
        prompt: `Based on this conversation, generate a short title (max 4-5 words) that captures the main topic or question:\n\n${messageText}`,
        schema: z.object({
          title: z
            .string()
            .describe(
              "A short, concise title for this conversation (4-5 words max)",
            ),
        }),
        system:
          "You generate short, descriptive titles for conversations. Keep titles concise (4-5 words max), clear, and focused on the main topic. Do not use quotes or punctuation.",
      });
    });

    await step.run("update-thread", async () => {
      await updateChatThread(threadId, organizationId, {
        title: result.title,
      });
    });

    logger.info(`Generated title for thread ${threadId}: ${result.title}`);

    return {
      success: true,
      threadId,
      title: result.title,
    };
  },
);

export default generateChatTitle;
