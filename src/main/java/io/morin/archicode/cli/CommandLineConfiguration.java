package io.morin.archicode.cli;

import io.quarkus.picocli.runtime.PicocliCommandLineFactory;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.inject.Produces;
import picocli.CommandLine;

/**
 * The command line of the application: the one Quarkus builds from {@link ArchiCode}, with the error path of
 * {@link ErrorOutput} (warnings, and a message in place of a stack trace).
 */
@ApplicationScoped
public class CommandLineConfiguration {

    @Produces
    CommandLine commandLine(PicocliCommandLineFactory factory, ErrorOutput errorOutput) {
        return errorOutput.install(factory.create());
    }
}
