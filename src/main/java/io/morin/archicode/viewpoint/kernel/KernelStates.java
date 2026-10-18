package io.morin.archicode.viewpoint.kernel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.ArchiCodeException;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import lombok.SneakyThrows;
import lombok.val;

/**
 * The seven words that a comparison puts on a box ({@code new}, {@code changed}, {@code removed}, {@code moved}, {@code split},
 * {@code merged}, {@code contains-changes}), as the viewpoint kernel says them (its {@code states} entry point, contract 5,
 * issue #34). They used to be written in the CLI twice, in the renderer and in the check of the states written by hand, and once
 * more in the editor; they are written in the kernel and nowhere else, and every host reads them from there.
 *
 * <p>What a host keeps is the look of each word (a glyph, a line), not the list: a test fails when a word of the kernel has no look.
 */
public final class KernelStates {

    /** Read on first use, outside a static initializer: a kernel of another version is one {@code error:} line, not an initializer error. */
    private static KernelStates instance;

    private final String container;
    private final List<String> all;
    private final Set<String> words;

    private KernelStates(String container, List<String> all) {
        this.container = container;
        this.all = all;
        this.words = Set.copyOf(all);
    }

    private static synchronized KernelStates get() {
        if (instance == null) {
            instance = read();
        }
        return instance;
    }

    @SneakyThrows
    private static KernelStates read() {
        val answer = new ObjectMapper().readTree(ViewpointKernel.getInstance().states());
        if (answer.path("version").asInt() != ViewpointKernel.CONTRACT_VERSION) {
            throw new ArchiCodeException(
                "the viewpoint kernel speaks version %s, this version of ArchiCode expects %s",
                answer.path("version").asText(),
                ViewpointKernel.CONTRACT_VERSION
            );
        }
        return new KernelStates(answer.path("container").asText(), wordsOf(answer.path("states")));
    }

    private static List<String> wordsOf(JsonNode list) {
        val words = new ArrayList<String>();
        list.forEach(word -> words.add(word.asText()));
        return List.copyOf(words);
    }

    /**
     * Every state word, the set a word written by hand is compared with.
     *
     * @return the seven words
     */
    public static Set<String> words() {
        return get().words;
    }

    /**
     * Every state word in the order of the kernel: the words of a relationship ({@code new}, {@code changed}, {@code removed}),
     * the words of an element that replaces others ({@code moved}, {@code split}, {@code merged}), then the word of a box that
     * holds a change, the last.
     *
     * @return the seven words
     */
    public static List<String> all() {
        return get().all;
    }

    /**
     * The word of a box that did not change and holds a change ({@code contains-changes}): the kernel says it computed it with
     * {@code contains_changes} in the item.
     *
     * @return the word
     */
    public static String container() {
        return get().container;
    }
}
