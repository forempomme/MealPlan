package com.mealplan.app;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.IOException;
import java.util.Iterator;
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import okhttp3.OkHttpClient;
import okhttp3.Request;
import okhttp3.Response;

/**
 * Pipeline d'import de recettes :
 *
 *  importFromUrl(url)
 *  ├─ jow.fr → tryJowApi()          GET api.jow.fr/public/recipe/{id}
 *  ├─ fetchHtml()                   OkHttp + User-Agent Chrome/Android
 *  └─ Jsoup.parse(html)
 *      ├─ parseJsonLd()             <script type="application/ld+json">
 *      ├─ parseNextData()           <script id="__NEXT_DATA__">
 *      └─ parseMicrodata()          [itemtype*=schema.org/Recipe]
 */
public class RecipeImporter {

    private static final OkHttpClient HTTP = new OkHttpClient.Builder()
            .connectTimeout(15, TimeUnit.SECONDS)
            .readTimeout(20, TimeUnit.SECONDS)
            .followRedirects(true)
            .build();

    private static final String USER_AGENT =
            "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 " +
            "(KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36";

    // ══════════════════════════════════════════════════════
    //  POINT D'ENTRÉE
    // ══════════════════════════════════════════════════════

    public static String importFromUrl(String url) {
        try {
            // ── Cas spécial Jow ───────────────────────────
            if (url.contains("jow.fr")) {
                String r = tryJowApi(url);
                if (r != null) return r;
                // Si l'API échoue on continue avec le parsing HTML
            }

            // ── Téléchargement HTML ───────────────────────
            String html = fetchHtml(url);
            if (html == null) return error("Impossible de télécharger la page");

            Document doc = Jsoup.parse(html, url);

            // ── 1. JSON-LD (méthode principale) ───────────
            String result = parseJsonLd(doc, url);
            if (result != null) return result;

            // ── 2. __NEXT_DATA__ (sites Next.js) ──────────
            result = parseNextData(doc, url);
            if (result != null) return result;

            // ── 3. Microdata (anciens sites) ──────────────
            result = parseMicrodata(doc, url);
            if (result != null) return result;

            return error("Aucune donnée de recette trouvée sur cette page");

        } catch (Exception e) {
            return error(e.getMessage());
        }
    }

    // ══════════════════════════════════════════════════════
    //  JOW API
    // ══════════════════════════════════════════════════════

    private static String tryJowApi(String url) {
        try {
            // Extrait l'ID de fin d'URL : /recipes/nom-de-recette-AB12CD
            Pattern p = Pattern.compile("/recipes/[^/?#]+-([A-Za-z0-9]{4,})(?:[/?#]|$)");
            Matcher m = p.matcher(url);
            if (!m.find()) return null;

            String id = m.group(1);
            String json = fetchHtml("https://api.jow.fr/public/recipe/" + id);
            if (json == null) return null;

            JSONObject d = new JSONObject(json);
            return parseJowJson(d, url);
        } catch (Exception e) {
            return null; // Fallback vers parsing HTML
        }
    }

    private static String parseJowJson(JSONObject d, String url) throws JSONException {
        JSONObject out = new JSONObject();
        out.put("name",            d.optString("title", d.optString("name", "")));
        out.put("servings",        d.optInt("serves", d.optInt("servings", 4)));
        out.put("cookTimeMinutes", d.optInt("cookingTime", d.optInt("totalTime", 0)) / 60);
        out.put("url",             url);
        out.put("note",            "");
        out.put("tags",            extractJowTags(d));

        // Ingrédients (déjà structurés côté Jow)
        JSONArray ings = new JSONArray();
        JSONArray src = d.has("constituents") ? d.getJSONArray("constituents")
                      : d.optJSONArray("ingredients");
        if (src != null) {
            for (int i = 0; i < src.length(); i++) {
                JSONObject c   = src.getJSONObject(i);
                JSONObject ing = c.optJSONObject("ingredient");
                String name    = ing != null ? ing.optString("name","") : c.optString("name","");
                double qty     = c.optDouble("quantity", 0);
                String unit    = c.optString("quantityUnit","");
                if ("unit".equalsIgnoreCase(unit)) unit = "";

                JSONObject o = new JSONObject();
                o.put("name", name);
                o.put("qty",  qty);
                o.put("unit", unit);
                ings.put(o);
            }
        }
        out.put("ingredients", ings);

        // Étapes
        JSONArray steps = new JSONArray();
        JSONArray jSteps = d.optJSONArray("steps");
        if (jSteps != null) {
            for (int i = 0; i < jSteps.length(); i++) {
                JSONObject s = jSteps.getJSONObject(i);
                String text = s.optString("description", s.optString("label",""));
                if (!text.isEmpty()) steps.put(text);
            }
        }
        out.put("steps", steps);
        return out.toString();
    }

    private static JSONArray extractJowTags(JSONObject d) {
        JSONArray tags = new JSONArray();
        JSONArray src = d.optJSONArray("tags");
        if (src == null) return tags;
        for (int i = 0; i < src.length(); i++) {
            try {
                Object t = src.get(i);
                tags.put(t instanceof JSONObject ? ((JSONObject)t).optString("name","") : t.toString());
            } catch (JSONException ignored) {}
        }
        return tags;
    }

    // ══════════════════════════════════════════════════════
    //  HTTP
    // ══════════════════════════════════════════════════════

    private static String fetchHtml(String url) {
        try {
            Request req = new Request.Builder()
                    .url(url)
                    .header("User-Agent",      USER_AGENT)
                    .header("Accept",          "text/html,application/xhtml+xml,application/json;q=0.9,*/*;q=0.8")
                    .header("Accept-Language", "fr-FR,fr;q=0.9,en;q=0.8")
                    .header("Accept-Encoding", "identity")
                    .build();
            try (Response res = HTTP.newCall(req).execute()) {
                if (!res.isSuccessful() || res.body() == null) return null;
                return res.body().string();
            }
        } catch (IOException e) {
            return null;
        }
    }

    // ══════════════════════════════════════════════════════
    //  PARSING JSON-LD
    // ══════════════════════════════════════════════════════

    private static String parseJsonLd(Document doc, String url) {
        for (Element script : doc.select("script[type=application/ld+json]")) {
            try {
                JSONObject recipe = findRecipe(script.html(), 10);
                if (recipe != null) return buildFromSchema(recipe, url);
            } catch (Exception ignored) {}
        }
        return null;
    }

    // ══════════════════════════════════════════════════════
    //  PARSING __NEXT_DATA__
    // ══════════════════════════════════════════════════════

    private static String parseNextData(Document doc, String url) {
        Element script = doc.selectFirst("script#__NEXT_DATA__");
        if (script == null) return null;
        try {
            JSONObject recipe = findRecipe(script.html(), 12);
            if (recipe != null) return buildFromSchema(recipe, url);
        } catch (Exception ignored) {}
        return null;
    }

    // ══════════════════════════════════════════════════════
    //  PARSING MICRODATA
    // ══════════════════════════════════════════════════════

    private static String parseMicrodata(Document doc, String url) {
        try {
            Element el = doc.selectFirst("[itemtype*=schema.org/Recipe]");
            if (el == null) return null;

            JSONObject out = new JSONObject();

            Element nameEl = el.selectFirst("[itemprop=name]");
            out.put("name", nameEl != null ? nameEl.text() : "");

            Element yield = el.selectFirst("[itemprop=recipeYield]");
            out.put("servings", yield != null
                    ? parseLeadingInt(yield.attr("content").isEmpty() ? yield.text() : yield.attr("content"), 4)
                    : 4);

            Element time = el.selectFirst("[itemprop=totalTime],[itemprop=cookTime]");
            if (time != null) {
                String iso = time.hasAttr("datetime") ? time.attr("datetime") : time.attr("content");
                out.put("cookTimeMinutes", parseIso8601Duration(iso.isEmpty() ? time.text() : iso));
            } else {
                out.put("cookTimeMinutes", 0);
            }

            // Ingrédients (chaînes brutes)
            JSONArray ings = new JSONArray();
            for (Element e : el.select("[itemprop=recipeIngredient],[itemprop=ingredients]")) {
                String raw = e.text().trim();
                if (!raw.isEmpty()) ings.put(raw);
            }
            out.put("ingredients", ings);

            // Étapes
            JSONArray steps = new JSONArray();
            for (Element e : el.select("[itemprop=recipeInstructions]")) {
                String txt = e.text().trim();
                if (!txt.isEmpty()) steps.put(txt);
            }
            out.put("steps", steps);

            out.put("tags", new JSONArray());
            out.put("note", "");
            out.put("url",  url);
            return out.toString();

        } catch (Exception e) {
            return null;
        }
    }

    // ══════════════════════════════════════════════════════
    //  RECHERCHE RÉCURSIVE D'UN OBJET @type Recipe
    // ══════════════════════════════════════════════════════

    private static JSONObject findRecipe(String jsonStr, int maxDepth) {
        jsonStr = jsonStr.trim();
        try {
            if (jsonStr.startsWith("{")) {
                return findInObject(new JSONObject(jsonStr), maxDepth);
            } else if (jsonStr.startsWith("[")) {
                JSONArray arr = new JSONArray(jsonStr);
                for (int i = 0; i < arr.length(); i++) {
                    try {
                        JSONObject found = findInObject(arr.getJSONObject(i), maxDepth);
                        if (found != null) return found;
                    } catch (JSONException ignored) {}
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    private static JSONObject findInObject(JSONObject obj, int depth) {
        if (depth <= 0 || obj == null) return null;

        // Vérifier @type
        String type = obj.optString("@type","");
        if (isRecipeType(type) && obj.has("name") &&
               (obj.has("recipeIngredient") || obj.has("recipeInstructions"))) {
            return obj;
        }

        // @graph (Marmiton, 750g…)
        JSONArray graph = obj.optJSONArray("@graph");
        if (graph != null) {
            for (int i = 0; i < graph.length(); i++) {
                try {
                    JSONObject found = findInObject(graph.getJSONObject(i), depth - 1);
                    if (found != null) return found;
                } catch (JSONException ignored) {}
            }
        }

        // Descente récursive dans toutes les clés
        Iterator<String> keys = obj.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            try {
                Object val = obj.get(key);
                if (val instanceof JSONObject) {
                    JSONObject found = findInObject((JSONObject) val, depth - 1);
                    if (found != null) return found;
                } else if (val instanceof JSONArray) {
                    JSONArray arr = (JSONArray) val;
                    for (int i = 0; i < arr.length(); i++) {
                        try {
                            JSONObject found = findInObject(arr.getJSONObject(i), depth - 1);
                            if (found != null) return found;
                        } catch (JSONException ignored) {}
                    }
                }
            } catch (Exception ignored) {}
        }
        return null;
    }

    private static boolean isRecipeType(String type) {
        if (type == null) return false;
        type = type.toLowerCase();
        return type.equals("recipe") || type.equals("https://schema.org/recipe")
            || type.equals("http://schema.org/recipe") || type.contains("/recipe");
    }

    // ══════════════════════════════════════════════════════
    //  CONSTRUCTION DU RÉSULTAT DEPUIS SCHEMA.ORG RECIPE
    // ══════════════════════════════════════════════════════

    private static String buildFromSchema(JSONObject r, String url) throws JSONException {
        JSONObject out = new JSONObject();

        out.put("name", r.optString("name",""));

        // Portions
        out.put("servings", extractYield(r));

        // Temps
        String t = r.optString("totalTime", r.optString("cookTime",""));
        out.put("cookTimeMinutes", parseIso8601Duration(t));

        // Ingrédients en chaînes brutes → JS appliquera parseIngredient()
        JSONArray ings = new JSONArray();
        Object ingObj = r.opt("recipeIngredient");
        if (ingObj instanceof JSONArray) {
            for (int i = 0; i < ((JSONArray)ingObj).length(); i++) {
                ings.put(((JSONArray)ingObj).getString(i));
            }
        } else if (ingObj instanceof String) {
            ings.put((String) ingObj);
        }
        out.put("ingredients", ings);

        // Étapes
        JSONArray steps = new JSONArray();
        Object instrObj = r.opt("recipeInstructions");
        if (instrObj instanceof JSONArray) {
            JSONArray arr = (JSONArray) instrObj;
            for (int i = 0; i < arr.length(); i++) {
                try {
                    Object item = arr.get(i);
                    if (item instanceof String) {
                        steps.put((String) item);
                    } else if (item instanceof JSONObject) {
                        JSONObject s = (JSONObject) item;
                        String text = s.optString("text", s.optString("description",""));
                        if (!text.isEmpty()) steps.put(text);
                        // HowToSection → itemListElement
                        JSONArray sub = s.optJSONArray("itemListElement");
                        if (sub != null) {
                            for (int j = 0; j < sub.length(); j++) {
                                String subText = sub.getJSONObject(j).optString("text","");
                                if (!subText.isEmpty()) steps.put(subText);
                            }
                        }
                    }
                } catch (Exception ignored) {}
            }
        } else if (instrObj instanceof String) {
            steps.put((String) instrObj);
        }
        out.put("steps", steps);

        // Tags (keywords + recipeCategory)
        JSONArray tags = new JSONArray();
        String kw = r.optString("keywords","");
        if (!kw.isEmpty()) {
            for (String k : kw.split("[,;]")) {
                String s = k.trim();
                if (!s.isEmpty()) tags.put(s);
            }
        }
        Object cat = r.opt("recipeCategory");
        if (cat instanceof String && !((String)cat).isEmpty()) tags.put(cat);
        out.put("tags", tags);

        out.put("note", r.optString("description",""));
        out.put("url",  url);
        return out.toString();
    }

    // ══════════════════════════════════════════════════════
    //  UTILITAIRES
    // ══════════════════════════════════════════════════════

    /** Parse la durée ISO 8601 : PT1H30M → 90 */
    private static int parseIso8601Duration(String iso) {
        if (iso == null || iso.isEmpty()) return 0;
        try {
            Pattern p = Pattern.compile("PT(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+)S)?",
                                        Pattern.CASE_INSENSITIVE);
            Matcher m = p.matcher(iso);
            if (m.find()) {
                int h   = m.group(1) != null ? Integer.parseInt(m.group(1)) : 0;
                int min = m.group(2) != null ? Integer.parseInt(m.group(2)) : 0;
                return h * 60 + min;
            }
        } catch (Exception ignored) {}
        return 0;
    }

    /** Extrait l'entier de tête d'une chaîne ("4 portions" → 4) */
    private static int parseLeadingInt(String s, int def) {
        if (s == null) return def;
        try {
            Matcher m = Pattern.compile("\\d+").matcher(s);
            return m.find() ? Integer.parseInt(m.group()) : def;
        } catch (Exception e) { return def; }
    }

    private static int extractYield(JSONObject r) {
        Object y = r.opt("recipeYield");
        if (y instanceof Integer)   return (Integer) y;
        if (y instanceof String)    return parseLeadingInt((String) y, 4);
        if (y instanceof JSONArray) {
            JSONArray arr = (JSONArray) y;
            if (arr.length() > 0) {
                try { return parseLeadingInt(arr.getString(0), 4); }
                catch (JSONException ignored) {}
            }
        }
        return 4;
    }

    private static String error(String msg) {
        try {
            return new JSONObject().put("error", msg != null ? msg : "Erreur inconnue").toString();
        } catch (JSONException e) {
            return "{\"error\":\"Erreur inconnue\"}";
        }
    }
}
