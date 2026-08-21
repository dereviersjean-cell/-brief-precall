import { Document, Page, View, Text, StyleSheet, Font, renderToBuffer } from "@react-pdf/renderer";
import path from "node:path";

// Inter embarquée plutôt que l'Helvetica intégrée aux PDF, pour deux raisons.
// La première est visuelle : Helvetica est LA signature d'un PDF généré à la
// va-vite. La seconde est un vrai défaut — avec Helvetica, toute espace
// suivant un « € » disparaît au rendu (« 12 M€en série B »), ce qu'aucun
// échappement ne corrige puisque le problème est dans les métriques.
//
// Chemin absolu depuis la racine du projet : le répertoire courant d'une
// fonction serverless n'est pas celui du fichier source.
const FONTS = path.join(process.cwd(), "lib/pdf/fonts");
Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(FONTS, "Inter-400.woff"), fontWeight: 400 },
    { src: path.join(FONTS, "Inter-400-italic.woff"), fontWeight: 400, fontStyle: "italic" },
    { src: path.join(FONTS, "Inter-600.woff"), fontWeight: 600 },
    { src: path.join(FONTS, "Inter-700.woff"), fontWeight: 700 },
  ],
});

// Pas de césure. react-pdf coupe les mots en fin de ligne par défaut, avec un
// algorithme anglais : « exacte-ment », « prépa-ration ». Sur un document
// court et destiné à être envoyé à un prospect, ça fait négligé.
Font.registerHyphenationCallback((word) => [word]);
import type { Brief } from "@/lib/types";

// Bleu de marque (--primary du design system). Le PDF ne peut pas lire les
// tokens CSS : la valeur est recopiée ici, c'est le seul endroit.
const BRAND = "#2A5CE0";
const BRAND_SOFT = "#F2F6FE";
const INK = "#0B1220";
const BODY = "#334155";
const MUTED = "#7C8BA1";
const RULE = "#E7ECF3";

const styles = StyleSheet.create({
  page: {
    fontSize: 10,
    fontFamily: "Inter",
    color: BODY,
    paddingTop: 0,
    paddingBottom: 64,
  },

  // Filet de marque pleine largeur : la Page n'a pas de marge horizontale,
  // c'est ce qui permet à ce trait d'aller d'un bord à l'autre. Tout le reste
  // vit dans `content`, qui porte les marges.
  topRule: { height: 4, backgroundColor: BRAND },

  content: { paddingHorizontal: 48 },

  header: { paddingTop: 40, paddingBottom: 22 },
  kicker: { fontSize: 7, color: MUTED, letterSpacing: 1.6 },
  title: { fontSize: 26, fontWeight: "bold", color: INK, marginTop: 10, lineHeight: 1.15 },
  meta: { fontSize: 9, color: MUTED, marginTop: 8 },

  headerRule: { height: 1, backgroundColor: RULE, marginBottom: 26 },

  // Accroche — le seul bloc coloré de la page. Un aplat léger et une barre
  // d'accent suffisent à le détacher sans alourdir.
  quote: {
    backgroundColor: BRAND_SOFT,
    borderLeftWidth: 2,
    borderLeftColor: BRAND,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 30,
  },
  quoteLabel: { fontSize: 6.5, color: BRAND, letterSpacing: 1.4, marginBottom: 7 },
  quoteText: { fontSize: 11.5, lineHeight: 1.55, color: INK, fontStyle: "italic" },

  section: { marginBottom: 26 },
  sectionHead: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  sectionLabel: { fontSize: 7, color: MUTED, letterSpacing: 1.4 },
  sectionRule: { flex: 1, height: 1, backgroundColor: RULE, marginLeft: 10 },

  paragraph: { fontSize: 10, lineHeight: 1.65, color: BODY },

  // Point numéroté : l'index dans une pastille, le texte aligné à droite de
  // celle-ci. Donne un rythme lisible quand il y a cinq ou six arguments.
  point: { flexDirection: "row", marginBottom: 14 },
  pointIndex: {
    width: 17,
    height: 17,
    borderRadius: 9,
    backgroundColor: BRAND_SOFT,
    color: BRAND,
    fontSize: 8,
    fontWeight: "bold",
    textAlign: "center",
    paddingTop: 4.5,
    marginRight: 11,
  },
  pointBody: { flex: 1 },
  pointTitle: { fontSize: 10.5, fontWeight: "bold", color: INK, marginBottom: 3, lineHeight: 1.35 },
  pointDetail: { fontSize: 9.5, lineHeight: 1.6, color: BODY },

  bullet: { flexDirection: "row", marginBottom: 7 },
  bulletDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: BRAND,
    marginTop: 6,
    marginRight: 10,
  },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.6, color: BODY },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: RULE,
    color: BODY,
    fontSize: 8.5,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 10,
  },

  footer: {
    position: "absolute",
    bottom: 28,
    left: 48,
    right: 48,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: RULE,
    paddingTop: 9,
  },
  footerText: { fontSize: 7.5, color: MUTED },
});

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  // wrap={false} : une section ne se coupe pas au milieu d'une page. Sans ça
  // un titre pouvait rester seul en bas de page, orphelin de son contenu.
  return (
    <View style={styles.section} wrap={false}>
      <View style={styles.sectionHead}>
        <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>
        <View style={styles.sectionRule} />
      </View>
      {children}
    </View>
  );
}

function Points({ points }: { points: { title: string; detail: string }[] }) {
  return (
    <>
      {points.map((p, i) => (
        <View key={i} style={styles.point}>
          <Text style={styles.pointIndex}>{i + 1}</Text>
          <View style={styles.pointBody}>
            <Text style={styles.pointTitle}>{p.title}</Text>
            {p.detail ? <Text style={styles.pointDetail}>{p.detail}</Text> : null}
          </View>
        </View>
      ))}
    </>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <>
      {items.map((line, i) => (
        <View key={i} style={styles.bullet}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>{line}</Text>
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
    <Document title={title} author="Brief" creator="Brief">
      <Page size="A4" style={styles.page}>
        <View style={styles.topRule} fixed />

        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.kicker}>BRIEF PRÉ-RENDEZ-VOUS</Text>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.meta}>{subtitle}</Text>
          </View>
          <View style={styles.headerRule} />

          {brief.suggestedOpeningLine ? (
            <View style={styles.quote} wrap={false}>
              <Text style={styles.quoteLabel}>ACCROCHE SUGGÉRÉE</Text>
              <Text style={styles.quoteText}>« {brief.suggestedOpeningLine} »</Text>
            </View>
          ) : null}

          {brief.companyOverview ? (
            <Section label="Vue d'ensemble">
              <Text style={styles.paragraph}>{brief.companyOverview}</Text>
            </Section>
          ) : null}

          {brief.painPoints?.length ? (
            <Section label="Points de douleur">
              <Points points={brief.painPoints} />
            </Section>
          ) : null}

          {brief.talkingPoints?.length ? (
            <Section label="Arguments commerciaux">
              <Points points={brief.talkingPoints} />
            </Section>
          ) : null}

          {brief.objectives?.length ? (
            <Section label="Objectifs du rendez-vous">
              <Bullets items={brief.objectives} />
            </Section>
          ) : null}

          {brief.recentNews?.length ? (
            <Section label="Actualités">
              <Bullets items={brief.recentNews} />
            </Section>
          ) : null}

          {brief.references?.length ? (
            <Section label="Références clients">
              <Points points={brief.references.map((r) => ({ title: r.client_name, detail: r.pitch }))} />
            </Section>
          ) : null}

          {brief.historiqueRelationnel ? (
            <Section label="Historique relationnel">
              <Text style={styles.paragraph}>{brief.historiqueRelationnel}</Text>
            </Section>
          ) : null}

          {brief.keywords?.length ? (
            <Section label="Vocabulaire métier">
              <View style={styles.chips}>
                {brief.keywords.map((k, i) => (
                  <Text key={i} style={styles.chip}>{k}</Text>
                ))}
              </View>
            </Section>
          ) : null}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Brief · brief-ai.fr</Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
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
