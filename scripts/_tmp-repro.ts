import { readConfig } from "../lib/admin-config";
import { generateBrief } from "../lib/brief-generator";
import { fetchRecentNews } from "../lib/news";
const news = await fetchRecentNews("Be WTR");
console.log("actualités:", news.length);
for (let i = 0; i < 3; i++) {
  try {
    await generateBrief("Be WTR", await readConfig(), { product_description: "Je vends des bouteilles d'eau à des hotels et des restaurants", icp: "Directeur des achats directeur commercial", sector: null }, undefined, news.length ? news : undefined);
    console.log(`essai ${i + 1}: OK`);
  } catch (e) { console.log(`essai ${i + 1}: ÉCHEC`, String(e)); }
}
