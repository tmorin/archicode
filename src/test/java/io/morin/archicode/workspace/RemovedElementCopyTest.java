package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.Replaces;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.viewpoint.kernel.PlateauComparer;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.nio.file.Files;
import java.nio.file.Path;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * A removed element that holds something another element replaced is in the workspace of the comparison without that
 * child ({@code WorkspaceFactory.onlyWhatIsRemoved}). It must be the same element otherwise, in every property an author
 * can write, and the baseline must be as it was (wave 013 review, #77 item 5).
 */
@QuarkusTest
class RemovedElementCopyTest {

    @Inject
    WorkspaceFactory workspaceFactory;

    @TempDir
    Path dir;

    @SneakyThrows
    private void write(String file, String text) {
        val path = dir.resolve(file);
        Files.createDirectories(path.getParent());
        Files.writeString(path, text);
    }

    private Path workspace(String baselineSystem, String baselineEnvironment) {
        write(
            "workspace.yaml",
            """
            settings:
              manifests:
                paths: ["plateaus/**"]
            """
        );
        // `a` is an empty layer over the root, `b` removes everything `a` has and brings the two elements that take the place of
        // a child of each of the two parents
        write(
            "plateaus/a/plateau.yaml",
            """
            header:
              kind: "archicode.morin.io/plateau"
              version: "1"
            content:
              id: "a"
            """
        );
        write(
            "plateaus/b/plateau.yaml",
            """
            header:
              kind: "archicode.morin.io/plateau"
              version: "1"
            content:
              id: "b"
              override: "a"
              patches:
                - operator: REMOVE
                  target: "shop"
                - operator: REMOVE
                  target: "billing"
                - operator: REMOVE
                  target: "prod"
                  layer: technology
                - operator: REMOVE
                  target: "other"
                  layer: technology
            """
        );
        write(
            "plateaus/a/app.yaml",
            """
            header:
              kind: "archicode.morin.io/system"
              version: "1"
            content:
            """ + baselineSystem
        );
        write(
            "plateaus/a/tec.yaml",
            """
            header:
              kind: "archicode.morin.io/environment"
              version: "1"
            content:
            """ + baselineEnvironment
        );
        write(
            "plateaus/a/billing.yaml",
            """
            header:
              kind: "archicode.morin.io/system"
              version: "1"
            content:
              id: "billing"
              name: "Billing"
            """
        );
        write(
            "plateaus/a/other.yaml",
            """
            header:
              kind: "archicode.morin.io/environment"
              version: "1"
            content:
              id: "other"
              name: "Other"
            """
        );
        // the plateau b has none of the two parents, and an element each that takes the place of their child
        write(
            "plateaus/b/app.yaml",
            """
            header:
              kind: "archicode.morin.io/system"
              version: "1"
              plateau: "b"
            content:
              id: "storefront"
              name: "Storefront"
              elements:
                - kind: "container"
                  id: "web"
                  name: "Web"
                  replaces:
                    - "shop.web"
            """
        );
        write(
            "plateaus/b/tec.yaml",
            """
            header:
              kind: "archicode.morin.io/environment"
              version: "1"
              plateau: "b"
            content:
              id: "cloud"
              name: "Cloud"
              elements:
                - kind: "node"
                  id: "vm"
                  name: "VM"
                  replaces:
                    - "prod.vm"
            """
        );
        return dir.resolve("workspace.yaml");
    }

    private static final String SHOP = """
      id: "shop"
      name: "Shop"
      description: "Sells things"
      qualifiers:
        - "web"
        - "legacy"
      tags:
        zone: "dmz"
      replaces:
        - "billing"
        - "billing"
      relationships:
        - destination: "billing"
          label: "pays"
          qualifiers:
            - "https"
          tags:
            port: "443"
        - destination: "billing"
          label: ""
      elements:
        - kind: "container"
          id: "web"
          name: "Web"
        - kind: "container"
          id: "old"
          name: "Old"
          description: "Goes away"
          tags:
            owner: "ops"
          elements:
            - kind: "component"
              id: "part"
              name: "Part"
    """;

    private static final String PROD = """
      id: "prod"
      name: "Production"
      description: "Where it runs"
      uses:
        - "other"
      elements:
        - kind: "node"
          id: "vm"
          name: "Old VM"
        - kind: "node"
          id: "db"
          name: "Database"
          applications:
            - "shop.old"
          qualifiers:
            - "postgres"
          tags:
            tier: "data"
    """;

    @SneakyThrows
    private void assertSame(Element expected, Element actual) {
        assertEquals(expected.getClass(), actual.getClass());
        assertEquals(expected.getId(), actual.getId());
        assertEquals(expected.getName(), actual.getName());
        assertEquals(expected.getDescription(), actual.getDescription());
        assertEquals(expected.getQualifiers(), actual.getQualifiers());
        assertEquals(expected.getTags(), actual.getTags());
        assertEquals(expected.getRelationships(), actual.getRelationships());
        assertEquals(expected.getReplaces(), actual.getReplaces());
        if (expected.getReplaces() instanceof Replaces written) {
            assertEquals(
                written.getWritten(),
                ((Replaces) actual.getReplaces()).getWritten(),
                "the replaces as the author wrote them"
            );
        }
        for (val getter : new String[] { "getUses", "getApplications" }) {
            val method = java.util.Arrays.stream(expected.getClass().getMethods())
                .filter(m -> m.getName().equals(getter))
                .findFirst();
            if (method.isPresent()) {
                assertEquals(method.get().invoke(expected), method.get().invoke(actual), getter);
            }
        }
    }

    @Test
    void aRemovedParentThatHoldsAReplacedChildKeepsEveryPropertyItHad() {
        val workspace = workspace(SHOP, PROD);
        val base = workspaceFactory.create(workspace, null, "a");
        val target = workspaceFactory.create(workspace, null, "b");
        val comparison = new PlateauComparer(new ObjectMapper()).compare(base, target);
        val union = workspaceFactory.createUnion(workspace, null, "b", base, comparison);

        for (val reference : new String[] { "shop", "prod" }) {
            val layerBase = reference.equals("shop") ? base.appIndex : base.techIndex;
            val layerUnion = reference.equals("shop") ? union.appIndex : union.techIndex;
            val expected = layerBase.getElementByReference(reference);
            val actual = layerUnion.getElementByReference(reference);
            assertSame(expected, actual);
            // what another element replaced is left behind, the rest of what it held stays
            assertTrue(((Parent<?>) actual).getElements().size() < ((Parent<?>) expected).getElements().size());
            // the baseline is as it was
            assertTrue(layerBase.searchElement(reference.equals("shop") ? "shop.web" : "prod.vm").isPresent());
        }
    }
}
