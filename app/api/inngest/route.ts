import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest";
import {
  processReferencesImport,
  syncRecallCalendars,
  sendFridayEveningDigests,
  sendMondayMorningDigests,
  reportBillingUsage,
  checkBillingGracePeriods,
  generateDealMemoryAfterCall,
  sendDealMorningEmails,
  refreshDealPipelines,
} from "@/lib/inngest-functions";

// La fiche deal d'un call (generateDealMemoryAfterCall) tient dans une seule
// étape : 30 à 60 s d'appel Sonnet, deux fois quand le deal n'est reconnu
// qu'après la première fiche, plus HubSpot.
export const maxDuration = 300;

// Crons retirés le 27/10/2026 pour tenir dans le quota Inngest du plan
// gratuit (50 000 exécutions par mois), parce qu'ils tournaient pour des
// fonctionnalités arrêtées. checkQuotesWithoutAcceptance,
// checkEmailsWithoutReply et syncHubSpotTaskStatuses ont été supprimés le
// 03/11/2026 avec les modules Devis et Tâches. Reste en code, débranché
// (remettre une ligne ici le relance) :
//  - syncDealOutcomes : une seule issue de deal remontée en trois mois ; le
//    deal HubSpot rattaché à la fiche (Deal Execution) dit désormais où en
//    est un deal.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    processReferencesImport,
    syncRecallCalendars,
    sendFridayEveningDigests,
    sendMondayMorningDigests,
    reportBillingUsage,
    checkBillingGracePeriods,
    generateDealMemoryAfterCall,
    sendDealMorningEmails,
    refreshDealPipelines,
  ],
});
