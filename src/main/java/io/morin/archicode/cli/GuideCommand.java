package io.morin.archicode.cli;

import jakarta.inject.Inject;
import picocli.CommandLine;

/**
 * {@code archicode guide}: prints the guide for an agent (wave 022, run 0159, issue #144). It loads no workspace.
 */
@CommandLine.Command(
    name = "guide",
    description = {
        "Print the guide to ArchiCode for an agent that has only this program.",
        "It holds the kinds of manifests and their keys, the commands and the conventions, with a small workspace to start from.",
        "It is Markdown on the standard output, versioned (the first line is `archicode guide <version>`), the same from any folder, and it loads no workspace."
    }
)
@SuppressWarnings("java:S106")
public class GuideCommand implements Runnable {

    @Inject
    Guide guide;

    @CommandLine.Spec
    CommandLine.Model.CommandSpec spec;

    @Override
    public void run() {
        // the standard output, as the other commands write it: the text ends with one line feed and has no other separator
        System.out.print(guide.render(spec.root()));
        System.out.flush();
    }
}
