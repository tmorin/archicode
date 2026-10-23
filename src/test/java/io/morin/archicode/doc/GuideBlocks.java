package io.morin.archicode.doc;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import lombok.SneakyThrows;
import lombok.val;

/**
 * What the tests read out of the text of {@code archicode guide} (wave 022, run 0159): its fenced code blocks. A {@code yaml}
 * block whose first line is {@code # file: <path>} is a file of the small workspace the guide ends with; a {@code bash} block is
 * a list of commands, one per line, each {@code archicode <arguments>} with an optional {@code # exit <n>} (0 when absent).
 */
public final class GuideBlocks {

    public record Block(String language, String text) {}

    public record Command(List<String> arguments, int exit, String line) {}

    private GuideBlocks() {}

    /** Every fenced block, in the order of the guide. */
    public static List<Block> blocks(String guide) {
        val out = new ArrayList<Block>();
        String language = null;
        val text = new StringBuilder();
        for (val line : guide.split("\n", -1)) {
            if (language == null && line.startsWith("```")) {
                language = line.substring(3).strip();
                text.setLength(0);
            } else if (language != null && line.equals("```")) {
                out.add(new Block(language, text.toString()));
                language = null;
            } else if (language != null) {
                text.append(line).append('\n');
            }
        }
        return out;
    }

    /** The files of the guide's workspace: {@code path -> content}, in the order of the guide. */
    public static Map<String, String> files(String guide) {
        val out = new LinkedHashMap<String, String>();
        for (val block : blocks(guide)) {
            if (block.language().equals("yaml") && block.text().startsWith("# file: ")) {
                val end = block.text().indexOf('\n');
                out.put(block.text().substring("# file: ".length(), end).strip(), block.text());
            }
        }
        return out;
    }

    /** Writes the files of the guide's workspace under a folder, as one would from the guide. */
    @SneakyThrows
    public static void write(String guide, Path folder) {
        for (val file : files(guide).entrySet()) {
            val target = folder.resolve(file.getKey());
            Files.createDirectories(target.getParent());
            Files.writeString(target, file.getValue());
        }
    }

    /** The commands of the {@code bash} blocks, in order. */
    public static List<Command> commands(String guide) {
        val out = new ArrayList<Command>();
        for (val block : blocks(guide)) {
            if (!block.language().equals("bash")) {
                continue;
            }
            for (val line : block.text().split("\n")) {
                if (!line.startsWith("archicode ")) {
                    continue;
                }
                var exit = 0;
                var command = line;
                val comment = line.indexOf("# exit ");
                if (comment >= 0) {
                    exit = Integer.parseInt(line.substring(comment + "# exit ".length()).strip());
                    command = line.substring(0, comment);
                }
                val words = command.strip().split("\\s+");
                out.add(new Command(List.of(words).subList(1, words.length), exit, line));
            }
        }
        return out;
    }
}
