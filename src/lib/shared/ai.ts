type AIOptions = {
  system: string;
  prompt: string;
  fallback: string;
};

type AIResponse = {
  enabled: boolean;
  mode: "provider" | "fallback";
  content: string;
};

function getAIConfig() {
  const baseUrl = process.env.LLM_API_BASE_URL;
  const apiKey = process.env.LLM_API_KEY;
  const model = process.env.LLM_API_MODEL;

  if (!baseUrl || !apiKey || !model) {
    return null;
  }

  return { baseUrl, apiKey, model };
}

export async function generateOptionalText({
  system,
  prompt,
  fallback,
}: AIOptions): Promise<AIResponse> {
  const config = getAIConfig();

  if (!config) {
    return {
      enabled: false,
      mode: "fallback",
      content: fallback,
    };
  }

  try {
    const response = await fetch(
      `${config.baseUrl.replace(/\/$/, "")}/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          temperature: 0.2,
          messages: [
            { role: "system", content: system },
            { role: "user", content: prompt },
          ],
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`LLM provider returned ${response.status}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content?.trim();

    if (!content) {
      throw new Error("LLM provider returned no content");
    }

    return {
      enabled: true,
      mode: "provider",
      content,
    };
  } catch {
    return {
      enabled: false,
      mode: "fallback",
      content: fallback,
    };
  }
}
