import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import {
  processReferencesImport,
  syncRecallCalendars,
  checkEmailsWithoutReply,
  checkQuotesWithoutAcceptance,
  syncHubSpotTaskStatuses,
  syncDealOutcomes,
  sendFridayEveningDigests,
  sendMondayMorningDigests,
  reportBillingUsage,
  checkBillingGracePeriods,
  generateDealMemoryAfterCall,
  sendDealMorningEmails,
} from "@/lib/inngest-functions";

// La fiche deal d'un call (generateDealMemoryAfterCall) tient dans une seule
// étape : 30 à 60 s d'appel Sonnet, deux fois quand le deal n'est reconnu
// qu'après la première fiche, plus HubSpot.
export const maxDuration = 300;

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processReferencesImport,
    syncRecallCalendars,
    checkEmailsWithoutReply,
    checkQuotesWithoutAcceptance,
    syncHubSpotTaskStatuses,
    syncDealOutcomes,
    sendFridayEveningDigests,
    sendMondayMorningDigests,
    reportBillingUsage,
    checkBillingGracePeriods,
    generateDealMemoryAfterCall,
    sendDealMorningEmails,
  ],
});
