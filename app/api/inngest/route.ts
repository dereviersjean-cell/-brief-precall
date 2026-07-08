import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import {
  processReferencesImport,
  syncRecallCalendars,
  checkEmailsWithoutReply,
  checkQuotesWithoutAcceptance,
} from "@/lib/inngest-functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processReferencesImport, syncRecallCalendars, checkEmailsWithoutReply, checkQuotesWithoutAcceptance],
});
