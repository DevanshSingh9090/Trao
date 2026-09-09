export interface LLMGenerateOptions {
  temperature?: number;
  maxOutputTokens?: number;
  jsonMode?: boolean;
}

export interface LLMClient {
  generate(
    system: string,
    user: string,
    options?: LLMGenerateOptions
  ): Promise<string>;
}

export class LLMError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "LLMError";
    this.code = code;
  }
}