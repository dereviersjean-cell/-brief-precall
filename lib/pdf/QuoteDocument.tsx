import { Document, Page, View, Text, Image, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Quote, QuoteLine } from "@/lib/db";
import { computeLineTotals, computeQuoteTotals } from "@/lib/quote-calc";

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 10, fontFamily: "Helvetica", color: "#1e293b" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 24 },
  companyBlock: { maxWidth: 240 },
  logo: { width: 100, maxHeight: 60, objectFit: "contain", marginBottom: 8 },
  companyName: { fontSize: 12, fontWeight: 700, marginBottom: 2 },
  smallText: { fontSize: 9, color: "#64748b", marginBottom: 1 },
  clientBlock: { maxWidth: 200, textAlign: "right" },
  clientLabel: { fontSize: 9, fontWeight: 700, color: "#1e293b", marginBottom: 2 },
  title: { fontSize: 18, fontWeight: 700, marginBottom: 4 },
  metaRow: { flexDirection: "row", gap: 16, marginBottom: 20 },
  table: { marginTop: 10 },
  tableHeader: { flexDirection: "row", gap: 8, borderBottom: "1px solid #cbd5e1", paddingBottom: 6, marginBottom: 4 },
  tableRow: { flexDirection: "row", gap: 8, paddingVertical: 6, borderBottom: "1px solid #e2e8f0" },
  th: { fontSize: 8, fontWeight: 700, color: "#64748b", textTransform: "uppercase" },
  // Fixed widths (not flex ratios) so columns never visually collide —
  // sum + gaps stays within the A4 content width (515pt after 40pt margins).
  colName: { width: 187 },
  colQty: { width: 30, textAlign: "right" },
  colUnit: { width: 45 },
  colPrice: { width: 60, textAlign: "right" },
  colDiscount: { width: 50, textAlign: "right" },
  colVat: { width: 35, textAlign: "right" },
  colTotal: { width: 60, textAlign: "right" },
  totalsBlock: { marginTop: 16, alignSelf: "flex-end", width: 220 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 2 },
  totalsLabel: { color: "#64748b" },
  totalsTtc: { fontSize: 12, fontWeight: 700, borderTop: "1px solid #cbd5e1", marginTop: 4, paddingTop: 4 },
  notesBlock: { marginTop: 24 },
  notesLabel: { fontSize: 9, fontWeight: 700, color: "#1e293b", marginBottom: 2 },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 8,
    color: "#94a3b8",
    borderTop: "1px solid #e2e8f0",
    paddingTop: 8,
  },
  legalMentions: { marginTop: 4 },
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
        <View style={styles.headerRow}>
          <View style={styles.companyBlock}>
            {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image, not an <img>, has no alt prop */}
            {company.company_logo_url && <Image src={company.company_logo_url} style={styles.logo} />}
            <Text style={styles.companyName}>{company.company_name || "—"}</Text>
            {company.company_address && <Text style={styles.smallText}>{company.company_address}</Text>}
            {company.company_siret && <Text style={styles.smallText}>SIRET : {company.company_siret}</Text>}
            {company.company_vat_number && <Text style={styles.smallText}>TVA : {company.company_vat_number}</Text>}
            {company.company_email && <Text style={styles.smallText}>{company.company_email}</Text>}
            {company.company_phone && <Text style={styles.smallText}>{company.company_phone}</Text>}
            {company.company_website && <Text style={styles.smallText}>{company.company_website}</Text>}
          </View>
          <View style={styles.clientBlock}>
            <Text style={styles.clientLabel}>Adressé à</Text>
            <Text style={styles.companyName}>{quote.client_name}</Text>
            {quote.client_address && <Text style={styles.smallText}>{quote.client_address}</Text>}
            {quote.client_siret && <Text style={styles.smallText}>SIRET : {quote.client_siret}</Text>}
            {quote.client_vat_number && <Text style={styles.smallText}>TVA : {quote.client_vat_number}</Text>}
            {quote.client_email && <Text style={styles.smallText}>{quote.client_email}</Text>}
          </View>
        </View>

        <Text style={styles.title}>DEVIS N° {quote.quote_number}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.smallText}>Émis le {formatDate(quote.issued_at)}</Text>
          {quote.valid_until && (
            <Text style={styles.smallText}>Valable jusqu&apos;au {formatDate(quote.valid_until)}</Text>
          )}
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.th, styles.colName]}>Désignation</Text>
            <Text style={[styles.th, styles.colQty]}>Qté</Text>
            <Text style={[styles.th, styles.colUnit]}>Unité</Text>
            <Text style={[styles.th, styles.colPrice]}>PU HT</Text>
            <Text style={[styles.th, styles.colDiscount]}>Remise</Text>
            <Text style={[styles.th, styles.colVat]}>TVA</Text>
            <Text style={[styles.th, styles.colTotal]}>Total HT</Text>
          </View>
          {lines.map((line) => {
            const computed = computeLineTotals(line);
            return (
              <View key={line.id} style={styles.tableRow} wrap={false}>
                <View style={styles.colName}>
                  <Text>{line.name}</Text>
                  {line.description && <Text style={[styles.smallText, { marginTop: 2 }]}>{line.description}</Text>}
                </View>
                <Text style={styles.colQty}>{line.quantity}</Text>
                <Text style={styles.colUnit}>{line.unit || ""}</Text>
                <Text style={styles.colPrice}>{formatCurrency(line.unit_price)}</Text>
                <Text style={styles.colDiscount}>
                  {computed.discount_amount > 0
                    ? line.discount_type === "percent"
                      ? `-${line.discount_value}%`
                      : `-${formatCurrency(line.discount_value)}`
                    : "—"}
                </Text>
                <Text style={styles.colVat}>{line.vat_rate}%</Text>
                <Text style={styles.colTotal}>{formatCurrency(computed.net_ht)}</Text>
              </View>
            );
          })}
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Sous-total HT</Text>
            <Text>{formatCurrency(totals.subtotal_ht)}</Text>
          </View>
          {totals.total_discount > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Total remises</Text>
              <Text>-{formatCurrency(totals.total_discount)}</Text>
            </View>
          )}
          {totals.vat_breakdown.map((v) => (
            <View style={styles.totalsRow} key={v.rate}>
              <Text style={styles.totalsLabel}>TVA {v.rate}%</Text>
              <Text>{formatCurrency(v.amount)}</Text>
            </View>
          ))}
          <View style={[styles.totalsRow, styles.totalsTtc]}>
            <Text>Total TTC</Text>
            <Text>{formatCurrency(totals.total_ttc)}</Text>
          </View>
        </View>

        {quote.notes && (
          <View style={styles.notesBlock}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.smallText}>{quote.notes}</Text>
          </View>
        )}

        <View style={styles.footer} fixed>
          {quote.payment_terms && <Text>Conditions de paiement : {formatPaymentTerms(quote.payment_terms)}</Text>}
          {company.company_rib && <Text>RIB : {company.company_rib}</Text>}
          {quote.legal_mentions && (
            <View style={styles.legalMentions}>
              {quote.legal_mentions.split("\n").map((line, i) => (
                <Text key={i} style={styles.smallText}>
                  {line}
                </Text>
              ))}
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}

export async function renderQuoteToPdfBuffer(quote: Quote, lines: QuoteLine[]): Promise<Buffer> {
  return renderToBuffer(<QuoteDocument quote={quote} lines={lines} />);
}
