import { createModelError, MODEL_ERROR_CODES } from "./errors.mjs";

/**
 * Stub for future live providers. Throws before any network primitive is used.
 */
export class LiveDisabledAdapter {
  constructor({ id = "openai" } = {}) {
    this.id = id;
    this.live = true;
  }

  complete() {
    throw createModelError(
      MODEL_ERROR_CODES.LIVE_PROVIDER_DISABLED,
      `live provider ${this.id} is disabled; no credentials and no network call were made`,
    );
  }
}
