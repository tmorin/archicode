package io.morin.archicode.cli;

import io.morin.archicode.rendering.gap.GapFormat;
import io.morin.archicode.rendering.gap.GapReport;
import io.morin.archicode.viewpoint.kernel.Comparison;
import io.morin.archicode.workspace.Removal;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import lombok.experimental.UtilityClass;
import lombok.val;

/** The table of changes written next to the views of a comparison, shared by {@code views generate} and {@code stories generate}. */
@UtilityClass
class GapFiles {

    /** {@code gap.md} and {@code gap.json} in the folder: the same text {@code archicode diff} prints, with the cascade of the removals. */
    static void write(Path directory, Comparison comparison, List<Removal.Effect> cascade) throws IOException {
        Files.createDirectories(directory);
        for (val gapFormat : List.of(GapFormat.MARKDOWN, GapFormat.JSON)) {
            Files.writeString(
                directory.resolve("gap." + gapFormat.extension()),
                GapReport.render(comparison, gapFormat, false, cascade),
                StandardCharsets.UTF_8
            );
        }
    }
}
