import { CachedContent } from "@google/genai";
import { go } from "~/server/external/google/client";

export async function generateContextForChunk(
  chunk: string,
  fullText: string,
  cache: CachedContent | undefined,
) {
  const contextForChunkResult = await googleGenAiClient.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `${
      // If we have the document cached, we don't need to include the whole document in the context since it's already there
      cache?.name
        ? ""
        : `<document> 
${fullText}
</document> 
`
    }

Here is the chunk we want to situate within the whole document 
<chunk> 
${chunk}
</chunk> 

Please give a short succinct context to situate this chunk within the overall document for the purposes of improving search retrieval of the chunk. Answer only with the succinct context and nothing else. `,
    config: {
      cachedContent: cache?.name,
    },
  });

  return contextForChunkResult.text || "";
}
