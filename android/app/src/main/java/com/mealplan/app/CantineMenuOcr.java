package com.mealplan.app;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.graphics.Rect;
import android.media.ExifInterface;
import android.os.Build;

import com.google.mlkit.vision.common.InputImage;
import com.google.mlkit.vision.text.Text;
import com.google.mlkit.vision.text.TextRecognition;
import com.google.mlkit.vision.text.TextRecognizer;
import com.google.mlkit.vision.text.latin.TextRecognizerOptions;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Lit un menu de cantine (grille hebdomadaire : jours en colonnes, 4 lignes
 * par jour — entrée / plat / fromage / dessert) via Google ML Kit Text
 * Recognition EMBARQUÉ (dépendance com.google.mlkit:text-recognition,
 * modèle livré dans l'APK) : 100% local, aucun réseau, aucune clé API.
 *
 * ML Kit ne comprend pas la mise en page — il renvoie juste du texte avec
 * des positions (x,y). Toute la reconstruction "quel texte appartient à
 * quel jour / quelle catégorie" est une heuristique géométrique ci-dessous,
 * qui suppose une mise en page stable (en-têtes "LUNDI 14/09" etc., colonnes
 * de largeur à peu près régulière). Un changement de mise en page du document
 * source peut dégrader la qualité d'extraction sans faire planter le code —
 * dans le pire cas, un jour mal découpé, pas un crash.
 *
 * Limite connue : quand l'OCR perd carrément un chiffre (ex: "29" lu "2") ou
 * remplace un séparateur par une lettre (ex: "9/10" lu "VI10"), aucune
 * correction automatique ci-dessous ne peut le deviner de façon fiable — ces
 * cas restent à corriger à la main via la liste dans Options.
 */
public class CantineMenuOcr {

    public interface Callback {
        void onResult(String resultJson); // {"days":[...]} ou {"error":"..."}
    }

    private static final String[] WEEKDAYS = { "LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI" };

    private static final Pattern YEAR_PATTERN = Pattern.compile("\\b(20\\d{2})\\b");

    // Capture un mot de 4 à 10 lettres (le jour, possiblement mal lu par l'OCR —
    // ex: "MAROI" au lieu de "MARDI") suivi d'une date JJ/MM. La validation du jour
    // de semaine se fait séparément via fuzzyWeekdayMatch (distance d'édition ≤ 1),
    // pas dans le regex lui-même.
    private static final Pattern DAY_HEADER_SCAN = Pattern.compile(
        "([A-Z]{4,10})\\D{0,3}(\\d{1,2})\\s*[/\\-]\\s*(\\d{1,2})",
        Pattern.CASE_INSENSITIVE
    );

    // ══════════════════════════════════════════════════════
    //  DÉCODAGE IMAGE — gère la rotation EXIF (photo prise en
    //  portrait mais enregistrée "à plat" avec métadonnée de rotation,
    //  cas très fréquent sur mobile et qui casserait toute la logique
    //  de colonnes/lignes ci-dessous si on l'ignorait).
    // ══════════════════════════════════════════════════════
    public static Bitmap decodeAndFixOrientation(byte[] bytes) {
        Bitmap bitmap = BitmapFactory.decodeByteArray(bytes, 0, bytes.length);
        if (bitmap == null) return null;
        int rotation = 0;
        // ExifInterface(InputStream) exige l'API 24 ; le projet cible minSdk 23.
        // En-dessous, on saute la correction de rotation plutôt que de planter
        // (NoSuchMethodError est une Error, pas une Exception — un try/catch
        // classique ne l'aurait pas rattrapée).
        if (Build.VERSION.SDK_INT >= 24) {
            try {
                ExifInterface exif = new ExifInterface(new ByteArrayInputStream(bytes));
                int orientation = exif.getAttributeInt(ExifInterface.TAG_ORIENTATION, ExifInterface.ORIENTATION_NORMAL);
                if (orientation == ExifInterface.ORIENTATION_ROTATE_90)  rotation = 90;
                else if (orientation == ExifInterface.ORIENTATION_ROTATE_180) rotation = 180;
                else if (orientation == ExifInterface.ORIENTATION_ROTATE_270) rotation = 270;
            } catch (Exception ignored) {
                // Pas d'EXIF lisible → on suppose l'image déjà dans le bon sens
            }
        }
        if (rotation == 0) return bitmap;
        Matrix m = new Matrix();
        m.postRotate(rotation);
        return Bitmap.createBitmap(bitmap, 0, 0, bitmap.getWidth(), bitmap.getHeight(), m, true);
    }

    // ══════════════════════════════════════════════════════
    //  POINT D'ENTRÉE — asynchrone (ML Kit renvoie un Task)
    // ══════════════════════════════════════════════════════
    public static void analyze(Bitmap bitmap, Callback callback) {
        try {
            final int imageWidth = bitmap.getWidth();
            InputImage image = InputImage.fromBitmap(bitmap, 0);
            TextRecognizer recognizer = TextRecognition.getClient(TextRecognizerOptions.DEFAULT_OPTIONS);
            recognizer.process(image)
                .addOnSuccessListener(text -> {
                    try {
                        callback.onResult(buildResult(text, imageWidth));
                    } catch (Exception e) {
                        callback.onResult(error("Analyse impossible : " + safeMsg(e)));
                    }
                })
                .addOnFailureListener(e -> callback.onResult(error("Lecture du texte impossible : " + safeMsg(e))));
        } catch (Exception e) {
            callback.onResult(error("Image invalide : " + safeMsg(e)));
        }
    }

    // ── Ligne OCR aplatie (texte + position) ──
    private static class OcrLine {
        final String text;
        final Rect rect;
        OcrLine(String text, Rect rect) { this.text = text; this.rect = rect; }
    }

    private static class DayHeader {
        final String weekday;
        final int day;
        int month; // mutable : corrigé par continuité chronologique si incohérent
        final Rect rect;
        DayHeader(String weekday, int day, int month, Rect rect) {
            this.weekday = weekday; this.day = day; this.month = month; this.rect = rect;
        }
    }

    // ══════════════════════════════════════════════════════
    //  RECONSTRUCTION DE LA GRILLE
    // ══════════════════════════════════════════════════════
    private static String buildResult(Text text, int imageWidth) throws JSONException {
        // 1. Aplatit tous les blocs OCR en liste de lignes avec position
        List<OcrLine> lines = new ArrayList<>();
        for (Text.TextBlock block : text.getTextBlocks()) {
            for (Text.Line line : block.getLines()) {
                Rect r = line.getBoundingBox();
                String t = line.getText();
                if (r != null && t != null && !t.trim().isEmpty()) {
                    lines.add(new OcrLine(t.trim(), r));
                }
            }
        }
        if (lines.isEmpty()) return error("Aucun texte détecté sur la photo.");

        // 2. Année : premier nombre à 4 chiffres de la forme 20XX (en-tête de période)
        int year = Calendar.getInstance().get(Calendar.YEAR);
        for (OcrLine l : lines) {
            Matcher m = YEAR_PATTERN.matcher(l.text);
            if (m.find()) { year = Integer.parseInt(m.group(1)); break; }
        }

        // 3. Sépare les en-têtes de jour ("LUNDI 14/09") du reste du texte. Le jour de
        // semaine est accepté par correspondance floue (distance d'édition ≤ 1) pour
        // tolérer une lettre mal lue par l'OCR (ex: "MAROI" → "MARDI").
        List<DayHeader> headers = new ArrayList<>();
        List<OcrLine> contentLines = new ArrayList<>();
        for (OcrLine l : lines) {
            Matcher m = DAY_HEADER_SCAN.matcher(l.text);
            boolean matched = false;
            if (m.find()) {
                String weekday = fuzzyWeekdayMatch(m.group(1));
                if (weekday != null) {
                    try {
                        int day   = Integer.parseInt(m.group(2));
                        int month = Integer.parseInt(m.group(3));
                        if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                            headers.add(new DayHeader(weekday, day, month, l.rect));
                            matched = true;
                        }
                    } catch (NumberFormatException ignored) {}
                }
            }
            if (!matched) contentLines.add(l);
        }
        if (headers.isEmpty()) {
            JSONObject err = new JSONObject();
            err.put("error", "Aucun jour détecté (en-têtes LUNDI/MARDI/… introuvables sur cette photo).");
            err.put("raw", buildRawDump(lines));
            return err.toString();
        }

        // 4. Regroupe les en-têtes en lignes de semaine par proximité verticale
        headers.sort(Comparator.comparingInt(h -> h.rect.top));
        int avgHeaderHeight = 0;
        for (DayHeader h : headers) avgHeaderHeight += h.rect.height();
        avgHeaderHeight = Math.max(10, avgHeaderHeight / headers.size());
        int clusterGap = avgHeaderHeight * 4; // au-delà de cet écart vertical : nouvelle semaine

        List<List<DayHeader>> weekRows = new ArrayList<>();
        List<DayHeader> current = new ArrayList<>();
        int lastTop = Integer.MIN_VALUE;
        for (DayHeader h : headers) {
            if (!current.isEmpty() && (h.rect.top - lastTop) > clusterGap) {
                weekRows.add(current);
                current = new ArrayList<>();
            }
            current.add(h);
            lastTop = h.rect.top;
        }
        if (!current.isEmpty()) weekRows.add(current);

        // 4bis. Trie chaque semaine par X (ordre chronologique Lundi→Vendredi) puis
        // corrige les mois incohérents avec la progression dans le temps. L'erreur la
        // plus fréquente observée : l'OCR lit "09" comme "01" (confusion du chiffre 9
        // avec 1). Un mois qui n'est ni le mois courant ni le mois suivant est donc
        // quasi certainement une erreur de lecture, pas un vrai changement de mois —
        // on le remplace par le dernier mois valide rencontré en parcourant la photo
        // du haut vers le bas.
        int knownMonth = -1;
        for (List<DayHeader> row : weekRows) {
            row.sort(Comparator.comparingInt(h -> h.rect.left));
            for (DayHeader h : row) {
                if (knownMonth != -1) {
                    boolean plausible = (h.month == knownMonth) || (h.month == (knownMonth % 12) + 1);
                    if (!plausible) h.month = knownMonth;
                }
                knownMonth = h.month;
            }
        }

        // 5. Pour chaque semaine : borne les colonnes (X, plafonnées — si un jour n'a pas
        //    été détecté comme en-tête, son contenu ne doit pas se déverser sans limite
        //    dans la colonne voisine) et la bande verticale (Y), regroupe les lignes de
        //    contenu en paragraphes, puis assigne jusqu'à 4 par jour.
        JSONArray days = new JSONArray();
        for (int wi = 0; wi < weekRows.size(); wi++) {
            List<DayHeader> row = weekRows.get(wi); // déjà trié par X à l'étape 4bis

            int rowBottom = (wi + 1 < weekRows.size()) ? minTop(weekRows.get(wi + 1)) : Integer.MAX_VALUE;

            // Largeur de colonne "typique" de cette semaine, pour plafonner les bornes
            // extrêmes — repli sur image/5 si une seule colonne a été détectée sur la ligne.
            int avgColWidth = imageWidth / 5;
            if (row.size() >= 2) {
                int span = row.get(row.size() - 1).rect.left - row.get(0).rect.left;
                avgColWidth = Math.max(span / (row.size() - 1), imageWidth / 10);
            }
            int maxOverhang = (int) (avgColWidth * 1.3);

            for (int ci = 0; ci < row.size(); ci++) {
                DayHeader h = row.get(ci);
                int leftBound  = (ci == 0)
                    ? Math.max(0, h.rect.left - maxOverhang)
                    : (row.get(ci - 1).rect.right + h.rect.left) / 2;
                int rightBound = (ci == row.size() - 1)
                    ? Math.min(imageWidth, h.rect.right + maxOverhang)
                    : (h.rect.right + row.get(ci + 1).rect.left) / 2;

                List<OcrLine> cell = new ArrayList<>();
                for (OcrLine l : contentLines) {
                    int cx = l.rect.centerX();
                    int cy = l.rect.centerY();
                    if (cx >= leftBound && cx < rightBound && cy > h.rect.top && cy < rowBottom) {
                        cell.add(l);
                    }
                }
                cell.sort(Comparator.comparingInt(l -> l.rect.top));

                List<String> paragraphs = mergeWrappedLines(cell);

                String entree  = paragraphs.size() > 0 ? paragraphs.get(0) : "";
                String plat    = paragraphs.size() > 1 ? paragraphs.get(1) : "";
                String fromage = paragraphs.size() > 2 ? paragraphs.get(2) : "";
                String dessert = paragraphs.size() > 3 ? paragraphs.get(3) : "";

                String date = String.format("%04d-%02d-%02d", year, h.month, h.day);
                JSONObject d = new JSONObject();
                d.put("date", date);
                d.put("entree", entree);
                d.put("plat", plat);
                d.put("fromage", fromage);
                d.put("dessert", dessert);
                days.put(d);
            }
        }

        JSONObject out = new JSONObject();
        out.put("days", days);
        out.put("raw", buildRawDump(lines)); // texte brut détecté, pour diagnostic
        return out.toString();
    }

    /**
     * Teste si `token` correspond à l'un des 5 jours de semaine, en acceptant une
     * différence d'un caractère (distance de Levenshtein ≤ 1) pour tolérer une
     * lettre mal lue par l'OCR (ex: "MAROI" → "MARDI", distance 1).
     */
    private static String fuzzyWeekdayMatch(String token) {
        String upper = token.toUpperCase();
        for (String w : WEEKDAYS) if (upper.equals(w)) return w;
        for (String w : WEEKDAYS) if (levenshtein(upper, w) <= 1) return w;
        return null;
    }

    private static int levenshtein(String a, String b) {
        int[][] dp = new int[a.length() + 1][b.length() + 1];
        for (int i = 0; i <= a.length(); i++) dp[i][0] = i;
        for (int j = 0; j <= b.length(); j++) dp[0][j] = j;
        for (int i = 1; i <= a.length(); i++) {
            for (int j = 1; j <= b.length(); j++) {
                int cost = a.charAt(i - 1) == b.charAt(j - 1) ? 0 : 1;
                dp[i][j] = Math.min(Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1), dp[i - 1][j - 1] + cost);
            }
        }
        return dp[a.length()][b.length()];
    }

    /**
     * Dump de toutes les lignes OCR brutes (texte + position), triées comme sur la
     * photo (haut→bas, gauche→droite). Permet de voir EXACTEMENT ce que l'OCR a lu,
     * indépendamment de l'heuristique de reconstruction de grille ci-dessus — utile
     * pour diagnostiquer un problème d'extraction sans deviner à l'aveugle.
     */
    private static JSONArray buildRawDump(List<OcrLine> lines) throws JSONException {
        List<OcrLine> sorted = new ArrayList<>(lines);
        sorted.sort(Comparator.<OcrLine>comparingInt(l -> l.rect.top / 20).thenComparingInt(l -> l.rect.left));
        JSONArray raw = new JSONArray();
        for (OcrLine l : sorted) {
            JSONObject o = new JSONObject();
            o.put("text", l.text);
            o.put("top", l.rect.top);
            o.put("left", l.rect.left);
            o.put("bottom", l.rect.bottom);
            raw.put(o);
        }
        return raw;
    }

    private static int minTop(List<DayHeader> row) {
        int m = Integer.MAX_VALUE;
        for (DayHeader h : row) m = Math.min(m, h.rect.top);
        return m;
    }

    /**
     * Regroupe les lignes OCR d'une cellule en paragraphes (catégories). Un jour n'a
     * pas toujours 4 catégories (ex: certains jours n'ont pas de fromage/laitage) —
     * prendre systématiquement les 3 plus grands écarts comme coupures forçait donc
     * parfois une coupure artificielle au milieu d'un plat sur plusieurs lignes.
     *
     * À la place : l'écart le plus PETIT entre deux lignes sert de référence pour ce
     * qu'est un simple retour à la ligne dans un même item. Tout écart significativement
     * plus grand (≥ 1,5× ce minimum) est traité comme une vraie coupure de catégorie —
     * borné à 3 coupures max (jamais plus de 4 catégories par jour). Cette approche
     * relative s'adapte à la résolution de chaque photo sans supposer de taille de
     * police fixe, et ne force plus de coupure là où il n'y en a pas.
     */
    private static List<String> mergeWrappedLines(List<OcrLine> cellLines) {
        int n = cellLines.size();
        List<String> paragraphs = new ArrayList<>();
        if (n == 0) return paragraphs;
        if (n == 1) { paragraphs.add(cellLines.get(0).text); return paragraphs; }

        int[] gaps = new int[n - 1];
        for (int i = 0; i < n - 1; i++) {
            gaps[i] = cellLines.get(i + 1).rect.top - cellLines.get(i).rect.bottom;
        }

        Set<Integer> breakPoints = new HashSet<>();
        if (n == 2) {
            // Seulement 2 lignes : pas assez de données pour distinguer "repli de ligne"
            // d'une "vraie coupure" par comparaison relative — on suppose 2 items distincts.
            breakPoints.add(0);
        } else {
            int minGap = Integer.MAX_VALUE;
            for (int g : gaps) if (g > 0) minGap = Math.min(minGap, g);
            if (minGap == Integer.MAX_VALUE) minGap = 1; // tous les écarts ≤ 0 (lignes superposées) : repli
            int threshold = (int) (minGap * 1.5);

            List<Integer> candidates = new ArrayList<>();
            for (int i = 0; i < gaps.length; i++) if (gaps[i] >= threshold) candidates.add(i);
            candidates.sort((a, b) -> gaps[b] - gaps[a]); // plus grand écart d'abord
            int limit = Math.min(3, candidates.size()); // jamais plus de 4 catégories
            for (int i = 0; i < limit; i++) breakPoints.add(candidates.get(i));
        }

        StringBuilder sb = new StringBuilder(cellLines.get(0).text);
        for (int i = 0; i < n - 1; i++) {
            if (breakPoints.contains(i)) {
                paragraphs.add(sb.toString());
                sb = new StringBuilder(cellLines.get(i + 1).text);
            } else {
                sb.append(' ').append(cellLines.get(i + 1).text);
            }
        }
        paragraphs.add(sb.toString());
        return paragraphs;
    }

    private static String safeMsg(Exception e) {
        String m = e.getMessage();
        return m != null ? m : e.getClass().getSimpleName();
    }

    private static String error(String msg) {
        try { return new JSONObject().put("error", msg).toString(); }
        catch (JSONException e) { return "{\"error\":\"Erreur inconnue\"}"; }
    }
}
