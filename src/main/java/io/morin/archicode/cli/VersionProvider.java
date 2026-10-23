package io.morin.archicode.cli;

import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import picocli.CommandLine;

/**
 * What {@code archicode --version} prints: one line, {@code archicode <version>}, the version of the build (wave 021, run
 * 0155, issue #149).
 *
 * <p>The version is {@code quarkus.application.version}, which the Quarkus Maven plugin sets from the {@code <version>} of
 * the {@code pom.xml} when it builds and which is fixed in the build: the jar, the container image and the native runner all
 * carry the version they were built from, with no file to read at run time, so nothing has to be added to
 * {@code quarkus.native.resources.includes}. The class is a bean (Arc builds it, no reflection), found by Picocli through the
 * factory of the Quarkus extension.
 */
@ApplicationScoped
public class VersionProvider implements CommandLine.IVersionProvider {

    @ConfigProperty(name = "quarkus.application.version")
    String version;

    @Override
    public String[] getVersion() {
        return new String[] { "archicode " + version };
    }
}
