package io.morin.archicode.workspace;

import io.morin.archicode.resource.workspace.Settings;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * Which facet names can be the name of a folder (wave 020, run 0146, issue #147, decision T2). The name of a facet goes into
 * the name of the folders the views are written in ({@code views-<plateau>-<facet>}, {@code <NN>-<view>-<facet>}), as it is
 * written, so a name that is not one folder name is refused when the workspace is loaded, with one sentence that names the
 * facet and says what to write. A name is not rewritten: two facets could then write in the same folder, and the folder would
 * no longer say the name. The editor says the same sentence, word for word ({@code facetNameProblem} in {@code standalone.html});
 * the cases are in {@code negative-cases.json}, N94 and the following, and run in both tools.
 * <p>
 * What is refused: an empty name, {@code .} and {@code ..}, a name that holds {@code /}, {@code \}, a NUL or another control
 * character, and, because a workspace is shared across systems, the names Windows refuses: {@code < > : " | ? *} and a name
 * that ends with a dot or a space. The first reason found, reading from the left, is the one told.
 */
@UtilityClass
public class FacetNames {

    /** What to write instead, in the sentence. */
    static final String ADVICE = "write a plain word, such as `journey`";

    /** The characters Windows does not allow in the name of a file. */
    private static final String WINDOWS_FORBIDDEN = "<>:\"|?*";

    /**
     * Why a name cannot be the name of a folder, or empty when it can.
     *
     * @param name the name of a facet, as written in the file
     * @return the reason, as it is told after {@code it} ({@code holds `/`}), or empty
     */
    public static Optional<String> reasonOf(String name) {
        if (name.isEmpty()) {
            return Optional.of("is empty");
        }
        if (".".equals(name)) {
            return Optional.of("is `.`, the folder itself");
        }
        if ("..".equals(name)) {
            return Optional.of("is `..`, the folder above");
        }
        for (int i = 0; i < name.length(); i++) {
            val c = name.charAt(i);
            if (c == '/' || c == '\\') {
                return Optional.of("holds `" + c + "`, which separates the folders of a path");
            }
            if (isControl(c)) {
                return Optional.of("holds a control character (" + escaped(c) + ")");
            }
            if (WINDOWS_FORBIDDEN.indexOf(c) >= 0) {
                return Optional.of("holds `" + c + "`, which Windows does not allow in the name of a folder");
            }
        }
        val last = name.charAt(name.length() - 1);
        if (last == '.') {
            return Optional.of("ends with a dot, which Windows does not allow in the name of a folder");
        }
        if (last == ' ') {
            return Optional.of("ends with a space, which Windows does not allow in the name of a folder");
        }
        return Optional.empty();
    }

    /**
     * The sentence for a facet whose name cannot be the name of a folder, or empty when it can.
     *
     * @param name the name of a facet, as written in the file
     * @return the sentence
     */
    public static Optional<String> problemOf(String name) {
        return reasonOf(name).map(
            reason ->
                "the facet name `" +
                shown(name) +
                "` cannot be the name of a folder: it " +
                reason +
                " (" +
                ADVICE +
                ")"
        );
    }

    /**
     * The sentences for the facets of the settings that cannot be a folder, in the order of the file.
     *
     * @param settings the settings of the workspace file
     * @return the sentences, none when every name can be a folder
     */
    public static List<String> problems(Settings settings) {
        val problems = new ArrayList<String>();
        for (val facet : settings.getFacets().getCustoms()) {
            problemOf(facet.getName()).ifPresent(problems::add);
        }
        return problems;
    }

    private static boolean isControl(char c) {
        return c < 0x20 || (c >= 0x7f && c <= 0x9f);
    }

    private static String escaped(char c) {
        return String.format("\\u%04X", (int) c);
    }

    /** The name as the sentence shows it: a control character is written out, so that the line stays readable. */
    private static String shown(String name) {
        val out = new StringBuilder();
        for (int i = 0; i < name.length(); i++) {
            val c = name.charAt(i);
            out.append(isControl(c) ? escaped(c) : String.valueOf(c));
        }
        return out.toString();
    }
}
