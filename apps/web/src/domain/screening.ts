/**
 * Pre-publish screening.
 *
 * This is a small on-device keyword rule standing in for the multilingual
 * moderation model the blueprint calls for. It never blocks silently: a
 * "revise" verdict always carries a reason, and the author can ask for a
 * human review instead of editing.
 *
 * Criticism of institutions and decisions is allowed; only wording aimed at a
 * person, or someone's contact details, is flagged.
 */
export type ScreenVerdict =
  | { verdict: "allow" }
  | { verdict: "revise"; reason: string };

const INSULT = /\b(idiot|stupid|moron|loser|shut up|hate you|ugly)\b/i;
const PHONE = /(?:\d[\s-]?){10,}/;

export function screen(text: string): ScreenVerdict {
  if (INSULT.test(text)) {
    return {
      verdict: "revise",
      reason: "It contains wording aimed at a person that may read as an insult.",
    };
  }
  if (PHONE.test(text)) {
    return {
      verdict: "revise",
      reason:
        "It appears to contain a phone number. Sharing someone’s contact details without consent is not allowed.",
    };
  }
  return { verdict: "allow" };
}
