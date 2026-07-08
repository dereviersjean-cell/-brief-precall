import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Quote, QuoteLine } from "@/lib/db";
import { computeLineTotals, computeQuoteTotals } from "@/lib/quote-calc";

const INDIGO = "#4F46E5";

const styles = StyleSheet.create({
  page: { fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },

  // Full-bleed band — Page itself has no padding, so this View (and the
  // footer band below) can span the true page edges. Everything else lives
  // inside `content`, which carries the 45pt margins instead of the Page.
  headerBand: {
    backgroundColor: INDIGO,
    height: 70,
    paddingHorizontal: 45,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLogoWrap: { justifyContent: "center" },
  headerLogo: { height: 36, maxWidth: 140, objectFit: "contain" },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#ffffff" },

  content: { paddingHorizontal: 45, paddingBottom: 110 },

  // Identity
  identitySection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 30,
  },
  quoteNumber: { fontSize: 28, fontWeight: "bold", color: "#111827" },
  issuedDate: { fontSize: 9, color: "#6B7280", marginTop: 4 },
  validityBadge: {
    flexShrink: 0,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  validityText: { fontSize: 9, color: "#4B5563" },

  // Parties (émetteur / destinataire)
  partiesSection: { flexDirection: "row", gap: 20, marginTop: 30 },
  partyBlock: { flex: 1 },
  partyLabel: { fontSize: 8, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
  partyName: { fontSize: 12, fontWeight: "bold", color: "#111827", marginBottom: 4 },
  partyLine: { fontSize: 9, color: "#4B5563", marginBottom: 2, lineHeight: 1.4 },

  // Table
  table: { marginTop: 40 },
  tableHeaderRow: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#F9FAFB",
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  th: { fontSize: 8, color: "#6B7280", textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottom: "0.5px solid #E5E7EB",
  },
  tableRowOdd: { backgroundColor: "#FAFAFA" },
  lineName: { fontSize: 10, fontWeight: "medium", color: "#111827" },
  lineDescription: { fontSize: 8.5, color: "#6B7280", marginTop: 2, lineHeight: 1.4 },
  colName: { width: 170 },
  colQty: { width: 28, textAlign: "right" },
  colUnit: { width: 40 },
  colPrice: { width: 55, textAlign: "right" },
  colDiscount: { width: 45, textAlign: "right" },
  colVat: { width: 32, textAlign: "right" },
  colTotal: { width: 55, textAlign: "right" },
  colTotalText: { fontWeight: "bold", color: "#111827" },
  cellText: { fontSize: 9, color: "#374151" },

  // Totals
  totalsBlock: {
    marginTop: 25,
    alignSelf: "flex-end",
    width: 250,
    backgroundColor: "#F9FAFB",
    borderRadius: 6,
    padding: 16,
  },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalsLabel: { fontSize: 10, color: "#4B5563" },
  totalsValue: { fontSize: 10, color: "#111827" },
  totalsSeparator: { borderTop: "1px solid #E5E7EB", marginVertical: 8 },
  totalsTtcLabel: { fontSize: 14, fontWeight: "bold", color: "#111827" },
  totalsTtcValue: { fontSize: 16, fontWeight: "bold", color: INDIGO },

  // Notes
  notesBlock: { marginTop: 25 },
  notesLabel: { fontSize: 8, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  notesText: { fontSize: 9.5, color: "#374151", lineHeight: 1.5 },

  // Footer (fixed, full-bleed)
  footerBand: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#F9FAFB",
    borderTop: "1px solid #E5E7EB",
    paddingVertical: 15,
    paddingHorizontal: 45,
  },
  footerColumns: { flexDirection: "row", gap: 20 },
  footerCol: { flex: 1 },
  footerLabel: { fontSize: 7, color: "#9CA3AF", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  footerText: { fontSize: 8, color: "#4B5563", lineHeight: 1.4 },
  pageNumber: { fontSize: 7, color: "#9CA3AF", textAlign: "center", marginTop: 10 },
});

// Intl.NumberFormat("fr-FR") uses a narrow no-break space (U+202F) as the
// thousands separator — Helvetica has no glyph for it, so react-pdf renders
// it as "/". Build the string manually with a plain space instead.
function formatCurrency(n: number): string {
  const negative = n < 0;
  const [intPart, decPart] = Math.abs(n).toFixed(2).split(".");
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${negative ? "-" : ""}${withThousands},${decPart} €`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

// A pure number ("30") means "30 days" — anything already containing words
// ("30 jours", "à réception") is shown as typed.
function formatPaymentTerms(terms: string): string {
  const trimmed = terms.trim();
  return /^\d+$/.test(trimmed) ? `${trimmed} jours` : trimmed;
}

type CompanySnapshot = {
  company_name?: string | null;
  company_siret?: string | null;
  company_vat_number?: string | null;
  company_address?: string | null;
  company_email?: string | null;
  company_phone?: string | null;
  company_website?: string | null;
  company_logo_url?: string | null;
  company_rib?: string | null;
};

export function QuoteDocument({ quote, lines }: { quote: Quote; lines: QuoteLine[] }) {
  const company = (quote.company_snapshot ?? {}) as CompanySnapshot;
  const totals = computeQuoteTotals(lines);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header band — full bleed, works with or without a logo */}
        <View style={styles.headerBand}>
          <View style={styles.headerLogoWrap}>
            {company.company_logo_url && (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not an <img>, has no alt prop
              <Image src={company.company_logo_url} style={styles.headerLogo} />
            )}
          </View>
          <Text style={styles.headerTitle}>DEVIS</Text>
        </View>

        <View style={styles.content}>
          {/* Identity */}
          <View style={styles.identitySection}>
            <View>
              <Text style={styles.quoteNumber}>N° {quote.quote_number}</Text>
              <Text style={styles.issuedDate}>Émis le {formatDate(quote.issued_at)}</Text>
            </View>
            {quote.valid_until && (
              <View style={styles.validityBadge}>
                <Text style={styles.validityText}>Valable jusqu&apos;au {formatDate(quote.valid_until)}</Text>
              </View>
            )}
          </View>

          {/* Parties */}
          <View style={styles.partiesSection}>
            <View style={styles.partyBlock}>
              <Text style={styles.partyLabel}>De</Text>
              <Text style={styles.partyName}>{company.company_name || "—"}</Text>
              {company.company_address && <Text style={styles.partyLine}>{company.company_address}</Text>}
              {company.company_siret && <Text style={styles.partyLine}>SIRET : {company.company_siret}</Text>}
              {company.company_vat_number && (
                <Text style={styles.partyLine}>TVA : {company.company_vat_number}</Text>
              )}
              {company.company_email && <Text style={styles.partyLine}>{company.company_email}</Text>}
              {company.company_phone && <Text style={styles.partyLine}>{company.company_phone}</Text>}
              {company.company_website && <Text style={styles.partyLine}>{company.company_website}</Text>}
            </View>
            <View style={styles.partyBlock}>
              <Text style={styles.partyLabel}>Pour</Text>
              <Text style={styles.partyName}>{quote.client_name}</Text>
              {quote.client_address && <Text style={styles.partyLine}>{quote.client_address}</Text>}
              {quote.client_siret && <Text style={styles.partyLine}>SIRET : {quote.client_siret}</Text>}
              {quote.client_vat_number && <Text style={styles.partyLine}>TVA : {quote.client_vat_number}</Text>}
              {quote.client_email && <Text style={styles.partyLine}>{quote.client_email}</Text>}
            </View>
          </View>

          {/* Lines table */}
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.th, styles.colName]}>Désignation</Text>
              <Text style={[styles.th, styles.colQty]}>Qté</Text>
              <Text style={[styles.th, styles.colUnit]}>Unité</Text>
              <Text style={[styles.th, styles.colPrice]}>PU HT</Text>
              <Text style={[styles.th, styles.colDiscount]}>Remise</Text>
              <Text style={[styles.th, styles.colVat]}>TVA</Text>
              <Text style={[styles.th, styles.colTotal]}>Total HT</Text>
            </View>
            {lines.map((line, i) => {
              const computed = computeLineTotals(line);
              return (
                <View
                  key={line.id}
                  style={i % 2 === 1 ? [styles.tableRow, styles.tableRowOdd] : styles.tableRow}
                  wrap={false}
                >
                  <View style={styles.colName}>
                    <Text style={styles.lineName}>{line.name}</Text>
                    {line.description && <Text style={styles.lineDescription}>{line.description}</Text>}
                  </View>
                  <Text style={[styles.cellText, styles.colQty]}>{line.quantity}</Text>
                  <Text style={[styles.cellText, styles.colUnit]}>{line.unit || ""}</Text>
                  <Text style={[styles.cellText, styles.colPrice]}>{formatCurrency(line.unit_price)}</Text>
                  <Text style={[styles.cellText, styles.colDiscount]}>
                    {computed.discount_amount > 0
                      ? line.discount_type === "percent"
                        ? `-${line.discount_value}%`
                        : `-${formatCurrency(line.discount_value)}`
                      : "—"}
                  </Text>
                  <Text style={[styles.cellText, styles.colVat]}>{line.vat_rate}%</Text>
                  <Text style={[styles.cellText, styles.colTotal, styles.colTotalText]}>
                    {formatCurrency(computed.net_ht)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Totals */}
          <View style={styles.totalsBlock}>
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Sous-total HT</Text>
              <Text style={styles.totalsValue}>{formatCurrency(totals.subtotal_ht)}</Text>
            </View>
            {totals.total_discount > 0 && (
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Total remises</Text>
                <Text style={styles.totalsValue}>-{formatCurrency(totals.total_discount)}</Text>
              </View>
            )}
            {totals.vat_breakdown.map((v) => (
              <View style={styles.totalsRow} key={v.rate}>
                <Text style={styles.totalsLabel}>TVA {v.rate}%</Text>
                <Text style={styles.totalsValue}>{formatCurrency(v.amount)}</Text>
              </View>
            ))}
            <View style={styles.totalsSeparator} />
            <View style={styles.totalsRow}>
              <Text style={styles.totalsTtcLabel}>Total TTC</Text>
              <Text style={styles.totalsTtcValue}>{formatCurrency(totals.total_ttc)}</Text>
            </View>
          </View>

          {/* Notes */}
          {quote.notes && (
            <View style={styles.notesBlock}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{quote.notes}</Text>
            </View>
          )}
        </View>

        {/* Footer band — fixed, full bleed */}
        <View style={styles.footerBand} fixed>
          <View style={styles.footerColumns}>
            {quote.payment_terms && (
              <View style={styles.footerCol}>
                <Text style={styles.footerLabel}>Conditions de paiement</Text>
                <Text style={styles.footerText}>{formatPaymentTerms(quote.payment_terms)}</Text>
              </View>
            )}
            {company.company_rib && (
              <View style={styles.footerCol}>
                <Text style={styles.footerLabel}>Coordonnées bancaires</Text>
                <Text style={styles.footerText}>{company.company_rib}</Text>
              </View>
            )}
            {quote.legal_mentions && (
              <View style={styles.footerCol}>
                <Text style={styles.footerLabel}>Mentions légales</Text>
                {quote.legal_mentions.split("\n").map((line, i) => (
                  <Text key={i} style={styles.footerText}>
                    {line}
                  </Text>
                ))}
              </View>
            )}
          </View>
          <Text
            style={styles.pageNumber}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderQuoteToPdfBuffer(quote: Quote, lines: QuoteLine[]): Promise<Buffer> {
  return renderToBuffer(<QuoteDocument quote={quote} lines={lines} />);
}
