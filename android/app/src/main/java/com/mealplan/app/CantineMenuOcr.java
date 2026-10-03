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
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
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
 */
public class CantineMenuOcr {

    public interface Callback {
        void onResult(String resultJson); // {"days":[...]} ou {"error":"..."}
    }

    private static final Pattern YEAR_PATTERN = Pattern.compile("\\b(20\\d{2})\\b");
    private static final Pattern DAY_HEADER_PATTERN = Pattern.compile(
        "(LUNDI|MARDI|MERCREDI|JEUDI|VENDREDI)\\D{0,3}(\\d{1,2})\\s*[/\\-]\\s*(\\d{1,2})",
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
        final int day, month;
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

        // 3. Sépare les en-têtes de jour ("LUNDI 14/09") du reste du texte
        List<DayHeader> headers = new ArrayList<>();
        List<OcrLine> contentLines = new ArrayList<>();
        for (OcrLine l : lines) {
            Matcher m = DAY_HEADER_PATTERN.matcher(l.text);
            boolean matched = false;
            if (m.find()) {
                try {
                    int day   = Integer.parseInt(m.group(2));
                    int month = Integer.parseInt(m.group(3));
                    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
                        headers.add(new DayHeader(m.group(1).toUpperCase(), day, month, l.rect));
                        matched = true;
                    }
                } catch (NumberFormatException ignored) {}
            }
            if (!matched) contentLines.add(l);
        }
        if (headers.isEmpty()) return error("Aucun jour détecté (en-têtes LUNDI/MARDI/… introuvables sur cette photo).");

        // 3bis. Hauteur de ligne "typique" (médiane) : sert à décider si deux lignes de
        // contenu consécutives sont UN SEUL item coupé par un retour à la ligne visuel
        // (ex: "Pâtes à" + "la bolognaise végétarienne" → un seul plat) ou DEUX catégories
        // distinctes. ML Kit renvoie une Line par ligne VISUELLE, pas par item — sans ça,
        // un plat qui prend 2 lignes dans la colonne étroite décale toutes les catégories
        // suivantes de ce jour-là.
        int typicalLineHeight = medianHeight(contentLines);
        int paragraphGapThreshold = Math.max(4, (int) (typicalLineHeight * 0.6));

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

        // 5. Pour chaque semaine : borne les colonnes (X, plafonnées — si un jour n'a pas
        //    été détecté comme en-tête, son contenu ne doit pas se déverser sans limite
        //    dans la colonne voisine) et la bande verticale (Y), regroupe les lignes de
        //    contenu en paragraphes, puis assigne jusqu'à 4 par jour.
        JSONArray days = new JSONArray();
        for (int wi = 0; wi < weekRows.size(); wi++) {
            List<DayHeader> row = weekRows.get(wi);
            row.sort(Comparator.comparingInt(h -> h.rect.left));

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

                List<String> paragraphs = mergeWrappedLines(cell, paragraphGapThreshold);

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
        return out.toString();
    }

    private static int minTop(List<DayHeader> row) {
        int m = Integer.MAX_VALUE;
        for (DayHeader h : row) m = Math.min(m, h.rect.top);
        return m;
    }

    /**
     * Fusionne les lignes OCR consécutives d'une cellule en paragraphes : un petit écart
     * vertical entre deux lignes (≤ gapThreshold) = retour à la ligne du même item, un
     * écart plus large = nouvelle catégorie (entrée/plat/fromage/dessert).
     */
    private static List<String> mergeWrappedLines(List<OcrLine> cellLines, int gapThreshold) {
        List<String> paragraphs = new ArrayList<>();
        StringBuilder current = null;
        int prevBottom = Integer.MIN_VALUE;
        for (OcrLine l : cellLines) {
            if (current != null && (l.rect.top - prevBottom) <= gapThreshold) {
                current.append(' ').append(l.text);
            } else {
                if (current != null) paragraphs.add(current.toString());
                current = new StringBuilder(l.text);
            }
            prevBottom = l.rect.bottom;
        }
        if (current != null) paragraphs.add(current.toString());
        return paragraphs;
    }

    private static int medianHeight(List<OcrLine> lines) {
        if (lines.isEmpty()) return 20; // repli raisonnable si aucune ligne de contenu
        List<Integer> heights = new ArrayList<>();
        for (OcrLine l : lines) heights.add(l.rect.height());
        Collections.sort(heights);
        return heights.get(heights.size() / 2);
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
