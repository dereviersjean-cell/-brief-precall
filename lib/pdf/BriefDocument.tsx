import { Document, Page, View, Text, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { Brief } from "@/lib/types";

// Bleu de marque (--primary du design system). Le PDF ne peut pas lire les
// tokens CSS : la valeur est recopiée ici, c'est le seul endroit.
const BRAND = "#2A5CE0";
const INK = "#0F172A";
const MUTED = "#64748B";

const styles = StyleSheet.create({
  page: { fontSize: 10, fontFamily: "Helvetica", color: INK, paddingBottom: 60 },

  headerBand: { backgroundColor: BRAND, paddingHorizontal: 42, paddingVertical: 22 },
  headerKicker: { fontSize: 8, color: "#C7D6FA", letterSpacing: 1.2 },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "#FFFFFF", marginTop: 6 },
  headerMeta: { fontSize: 9, color: "#DCE6FB", marginTop: 5 },

  content: { paddingHorizontal: 42, paddingTop: 24 },

  opening: {
    backgroundColor: "#EEF3FE",
    borderLeftWidth: 3,
    borderLeftColor: BRAND,
    padding: 12,
    marginBottom: 20,
  },
  openingLabel: { fontSize: 7.5, color: BRAND, letterSpacing: 1, marginBottom: 5 },
  openingText: { fontSize: 11, lineHeight: 1.5, fontStyle: "italic" },

  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 8, color: MUTED, letterSpacing: 1.1, marginBottom: 8 },
  paragraph: { fontSize: 10, lineHeight: 1.55 },

  item: { marginBottom: 9 },
  itemTitle: { fontSize: 10, fontWeight: "bold", marginBottom: 2 },
  itemDetail: { fontSize: 9.5, color: "#334155", lineHeight: 1.5 },

  bulletRow: { flexDirection: "row", marginBottom: 5 },
  bulletDot: { width: 10, fontSize: 10, color: BRAND },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.5 },

  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  chip: {
    backgroundColor: "#EEF3FE",
    color: BRAND,
    fontSize: 8.5,
    paddingVertical: 3,
    paddingHorizontal: 7,
    borderRadius: 8,
  },

  footer: {
    position: "absolute",
    bottom: 24,
    left: 42,
    right: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
  },
  footerText: { fontSize: 7.5, color: MUTED },
});

// `fixed` sur le pied de page : react-pdf le répète sur chaque page. Sans ça
// il n'apparaîtrait que sur la première, et un brief dépasse souvent une page.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section} wrap={false}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      {children}
    </View>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {items.map((line, i) => (
        <View key={i} style={styles.bulletRow}>
          <Text style={styles.bulletDot}>•</Text>
          <Text style={styles.bulletText}>{line}</Text>
        </View>
      ))}
    </>
  );
}

function Points({ points }: { points: { title: string; detail: string }[] }) {
  return (
    <>
      {points.map((p, i) => (
        <View key={i} style={styles.item}>
          <Text style={styles.itemTitle}>{p.title}</Text>
          <Text style={styles.itemDetail}>{p.detail}</Text>
        </View>
      ))}
    </>
  );
}

export function BriefDocument({
  title,
  subtitle,
  brief,
}: {
  title: string;
  subtitle: string;
  brief: Brief;
}) {
  return (
    <Document title={title} author="Brief">
      <Page size="A4" style={styles.page}>
        <View style={styles.headerBand}>
          <Text style={styles.headerKicker}>BRIEF PRÉ-RENDEZ-VOUS</Text>
          <Text style={styles.headerTitle}>{title}</Text>
          <Text style={styles.headerMeta}>{subtitle}</Text>
        </View>

        <View style={styles.content}>
          {brief.suggestedOpeningLine ? (
            <View style={styles.opening}>
              <Text style={styles.openingLabel}>ACCROCHE SUGGÉRÉE</Text>
              <Text style={styles.openingText}>« {brief.suggestedOpeningLine} »</Text>
            </View>
          ) : null}

          {brief.companyOverview ? (
            <Section title="Vue d'ensemble">
              <Text style={styles.paragraph}>{brief.companyOverview}</Text>
            </Section>
          ) : null}

          {brief.painPoints?.length ? (
            <Section title="Points de douleur">
              <Points points={brief.painPoints} />
            </Section>
          ) : null}

          {brief.talkingPoints?.length ? (
            <Section title="Arguments commerciaux">
              <Points points={brief.talkingPoints} />
            </Section>
          ) : null}

          {brief.objectives?.length ? (
            <Section title="Objectifs du rendez-vous">
              <Bullets items={brief.objectives} />
            </Section>
          ) : null}

          {brief.recentNews?.length ? (
            <Section title="Actualités">
              <Bullets items={brief.recentNews} />
            </Section>
          ) : null}

          {brief.references?.length ? (
            <Section title="Références clients">
              <Points points={brief.references.map((r) => ({ title: r.client_name, detail: r.pitch }))} />
            </Section>
          ) : null}

          {brief.historiqueRelationnel ? (
            <Section title="Historique relationnel">
              <Text style={styles.paragraph}>{brief.historiqueRelationnel}</Text>
            </Section>
          ) : null}

          {brief.keywords?.length ? (
            <Section title="Vocabulaire métier">
              <View style={styles.chipRow}>
                {brief.keywords.map((k, i) => (
                  <Text key={i} style={styles.chip}>{k}</Text>
                ))}
              </View>
            </Section>
          ) : null}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Généré par Brief · brief-ai.fr</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}

export async function renderBriefToPdfBuffer(
  title: string,
  subtitle: string,
  brief: Brief
): Promise<Buffer> {
  return renderToBuffer(<BriefDocument title={title} subtitle={subtitle} brief={brief} />);
}
