import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export interface MetricResult {
  score: number;
  reason: string;
}

export interface EvaluationResult {
  contextRelevance: MetricResult;
  faithfulness: MetricResult;
  answerRelevance: MetricResult;
  completeness: MetricResult;
}

export class GroqEvaluator {
  constructor(
    private readonly model = "llama-3.3-70b-versatile"
  ) {}

  async evaluate(params: {
    query: string;
    answer: string;
    retrievalContext: string[];
  }): Promise<EvaluationResult> {
    const prompt = `
You are an expert evaluator for Retrieval-Augmented Generation (RAG) systems.

Evaluate the following answer ONLY using the retrieved context.

Question:
${params.query}

Retrieved Context:
${params.retrievalContext.join("\n\n-----------------\n\n")}

Generated Answer:
${params.answer}

Evaluate the answer on FOUR metrics.

--------------------------------------------------
1. Context Relevance
--------------------------------------------------

Does the retrieved context contain the information needed to answer the question?

1.0 = perfectly relevant
0.8 = mostly relevant
0.6 = partially relevant
0.4 = weakly relevant
0.2 = mostly irrelevant
0.0 = irrelevant

--------------------------------------------------
2. Faithfulness
--------------------------------------------------

Are ALL factual claims in the answer supported by the retrieved context?

Never use outside knowledge.

1.0 = every claim supported
0.8 = almost all supported
0.6 = some unsupported claims
0.4 = many hallucinations
0.2 = mostly hallucinated
0.0 = entirely fabricated

--------------------------------------------------
3. Answer Relevance
--------------------------------------------------

Does the answer directly answer the user's question?

1.0 = fully answers
0.8 = mostly answers
0.6 = partially answers
0.4 = weak answer
0.2 = barely answers
0.0 = unrelated

--------------------------------------------------
4. Completeness
--------------------------------------------------

Does the answer include all important information available in the retrieved context?

1.0 = complete
0.8 = minor omission
0.6 = some missing information
0.4 = major omission
0.2 = severely incomplete
0.0 = almost no useful information

Return ONLY valid JSON.

{
  "contextRelevance": {
    "score": 0.95,
    "reason": "..."
  },
  "faithfulness": {
    "score": 1.0,
    "reason": "..."
  },
  "answerRelevance": {
    "score": 0.92,
    "reason": "..."
  },
  "completeness": {
    "score": 0.88,
    "reason": "..."
  }
}
`;

    const completion = await groq.chat.completions.create({
      model: this.model,
      temperature: 0,
      response_format: {
        type: "json_object",
      },
      messages: [
        {
          role: "system",
          content:
            "You are an objective RAG evaluator. Return ONLY JSON.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const text = completion.choices[0].message.content;

    if (!text) {
      throw new Error("Empty response from Groq.");
    }

    return JSON.parse(text);
  }
}