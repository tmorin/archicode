package io.morin.archicode.manifest;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.morin.archicode.ArchiCodeException;
import io.morin.archicode.MapperFactory;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.plateau.Patch;
import io.morin.archicode.resource.plateau.PlateauTree;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.Set;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

/**
 * The model of the plateaus as the loader will use it (run 0077, wave 014, W-3): the tree a workspace's manifests make, the
 * chain a plateau is loaded from, what each plateau declares, and the patches a manifest carries. The sentences of the
 * mistakes are pinned by {@code PlateauModelTest}; this class pins what the next runs call.
 */
class PlateauTreeTest {

    @TempDir
    Path dir;

    @SneakyThrows
    private void write(String file, String text) {
        val path = dir.resolve(file);
        Files.createDirectories(path.getParent());
        Files.writeString(path, text);
    }

    private static String manifest(String kind, String header, String content) {
        return "header:\n  kind: \"archicode.morin.io/%s\"\n  version: \"1\"\n%scontent:\n%s".formatted(
            kind,
            header,
            content
        );
    }

    private ManifestParser.Parsed parse() {
        return new ManifestParser(new MapperFactory()).parse(dir, Set.of("manifests"));
    }

    @Test
    void shouldHaveBaselineAloneForAWorkspaceThatUsesNoPlateau() {
        write("manifests/shop.yaml", manifest("system", "", "  id: \"shop\"\n"));
        val parsed = parse();
        assertFalse(parsed.plateaus().isLayered());
        assertNull(parsed.plateaus().layeredBy());
        assertEquals(List.of("baseline"), parsed.plateaus().ids());
        assertEquals(List.of(), parsed.plateaus().warnings());
        assertEquals(
            List.of("baseline"),
            parsed.plateaus().chain("baseline").stream().map(PlateauTree.Node::id).toList()
        );
        assertEquals(Set.of(), parsed.ofPlateau("baseline").views());
    }

    @Test
    void shouldGiveTheChainOfAPlateauFromTheRootAndTheOrderOfTheTree() {
        for (val id : List.of("saas", "inhouse")) {
            write(
                "manifests/" + id + ".yaml",
                manifest("plateau", "", "  id: \"" + id + "\"\n  name: \"" + id + "\"\n")
            );
        }
        write(
            "manifests/marketplace.yaml",
            manifest("plateau", "", "  id: \"marketplace\"\n  override: \"inhouse\"\n  horizon: \"2027-Q4\"\n")
        );
        write("manifests/cdn.yaml", manifest("plateau", "", "  id: \"cdn\"\n  override: \"marketplace\"\n"));
        val tree = parse().plateaus();

        assertEquals(List.of("baseline", "inhouse", "marketplace", "cdn", "saas"), tree.ids());
        assertEquals(
            List.of("baseline", "inhouse", "marketplace", "cdn"),
            tree.chain("cdn").stream().map(PlateauTree.Node::id).toList()
        );
        assertEquals(
            List.of("baseline", "inhouse", "marketplace"),
            tree.ancestors("cdn").stream().map(PlateauTree.Node::id).toList()
        );
        assertEquals(List.of(), tree.ancestors("baseline"));
        assertEquals(List.of("inhouse", "saas"), tree.children("baseline").stream().map(PlateauTree.Node::id).toList());
        assertEquals("2027-Q4", tree.node("marketplace").horizon());
        assertEquals("inhouse", tree.node("marketplace").parent());
        assertNull(tree.node("baseline").parent());
        assertEquals("manifests/saas.yaml", tree.node("saas").manifest());
        assertTrue(tree.contains("cdn"));
        assertFalse(tree.contains("nothing"));
        assertEquals(
            "unknown plateau `nothing`: the plateaus of this workspace are `baseline`, `inhouse`, `marketplace`, `cdn` and `saas`",
            assertThrows(ArchiCodeException.class, () -> tree.chain("nothing")).getMessage()
        );
    }

    @Test
    void shouldKeepWhatEachPlateauDeclaresApart() {
        write("manifests/shop.yaml", manifest("system", "", "  id: \"shop\"\n"));
        write("manifests/later.yaml", manifest("plateau", "", "  id: \"later\"\n"));
        write("manifests/mail.yaml", manifest("system", "  plateau: \"later\"\n", "  id: \"mail\"\n"));
        write(
            "manifests/later-view.yaml",
            manifest("view", "  plateau: \"later\"\n", "  id: \"v\"\n  viewpoint: \"overview\"\n")
        );
        write("manifests/story.yaml", manifest("story", "", "  id: \"tour\"\n"));
        val parsed = parse();

        // a view and a story belong to no plateau: the key of the view names none, and is told as ignored
        assertTrue(parsed.plateaus().isLayered());
        assertEquals(
            "`manifests/later.yaml` is a manifest of kind `archicode.morin.io/plateau`",
            parsed.plateaus().layeredBy()
        );
        assertEquals(
            List.of(
                "`manifests/later-view.yaml` is a view and says `plateau: later` in its header, which is ignored: a view exists whatever plateau is drawn"
            ),
            parsed.warnings()
        );

        val baseline = parsed.ofPlateau("baseline");
        assertEquals(Set.of("shop"), references(baseline));
        assertEquals("baseline", baseline.elements().get(Application.class).iterator().next().getPlateau());

        val later = parsed.ofPlateau("later");
        assertEquals(Set.of("mail"), references(later));
        assertEquals("later", later.elements().get(Application.class).iterator().next().getPlateau());
        // the views and the stories are the workspace's, not a plateau's
        assertEquals(Set.of(), later.views());
        assertEquals(Set.of(), later.stories());
        assertEquals(
            List.of("v"),
            parsed
                .views()
                .stream()
                .map(v -> v.getId())
                .toList()
        );
        assertEquals(
            List.of("tour"),
            parsed
                .stories()
                .stream()
                .map(v -> v.getId())
                .toList()
        );
        assertEquals("manifests/later-view.yaml", parsed.placedViews().get(0).source());
        // the whole workspace is still there
        assertEquals(Set.of("shop", "mail"), references(parsed));
    }

    private static Set<String> references(ManifestParser.Parsed parsed) {
        val out = new java.util.TreeSet<String>();
        parsed
            .elements()
            .values()
            .forEach(set -> set.forEach(c -> out.add(c.getReference())));
        return out;
    }

    @Test
    void shouldCarryThePatchesOfAPlateauAsData() {
        write(
            "manifests/later.yaml",
            manifest(
                "plateau",
                "",
                """
                  id: "later"
                  patches:
                    - operator: REMOVE
                      target: "shop.cache"
                    - operator: set
                      target: "prod.vm"
                      layer: TECHNOLOGY
                      field: description
                      value: "a vm"
                    - operator: MERGE
                      json_path: "$.application.elements[*]"
                      expect: 2
                      field: tags
                      value: {a: "b"}
                    - operator: SET
                      target: "fulfilment.sync"
                      field: relationships
                      where: {destination: "shop.db", label: "reads"}
                      value: {label: "writes"}
                """
            )
        );
        val patches = parse().plateaus().node("later").patches();

        assertEquals(4, patches.size());
        assertEquals(Patch.Operator.REMOVE, patches.get(0).getOperator());
        assertEquals("shop.cache", patches.get(0).getTarget());
        assertNull(patches.get(0).getLayer());
        assertEquals(Patch.Operator.SET, patches.get(1).getOperator(), "an operator is read in any case");
        assertEquals(Patch.Layer.TECHNOLOGY, patches.get(1).getLayer());
        assertEquals("description", patches.get(1).getField());
        assertEquals("a vm", patches.get(1).getValue().asText());
        assertEquals("$.application.elements[*]", patches.get(2).getJsonPath(), "json_path is read as json-path");
        assertEquals(2, patches.get(2).getExpect());
        assertEquals("b", patches.get(2).getValue().get("a").asText());
        assertEquals("shop.db", patches.get(3).getWhere().getDestination());
        assertEquals("reads", patches.get(3).getWhere().getLabel());
    }

    @Test
    void shouldReadAPlateauWithNoPatchAndAPatchesKeyThatIsEmpty() {
        write("manifests/a.yaml", manifest("plateau", "", "  id: \"a\"\n"));
        write("manifests/b.yaml", manifest("plateau", "", "  id: \"b\"\n  patches:\n"));
        write("manifests/c.yaml", manifest("plateau", "", "  id: \"c\"\n  patches: [~]\n"));
        val tree = parse().plateaus();
        assertEquals(List.of(), tree.node("a").patches());
        assertEquals(List.of(), tree.node("b").patches(), "an empty key is no patch");
        assertEquals(List.of(), tree.node("c").patches(), "a null item is no patch");
    }

    @Test
    void shouldNotWarnForTheBaselineOrForIdsTwoLettersApart() {
        write("manifests/b.yaml", manifest("plateau", "", "  id: \"baseline\"\n  name: \"Monolith\"\n"));
        write("manifests/s.yaml", manifest("system", "  plateau: \"baseline\"\n", "  id: \"shop\"\n"));
        write("manifests/x.yaml", manifest("plateau", "", "  id: \"to-be\"\n"));
        write("manifests/y.yaml", manifest("plateau", "", "  id: \"as-is\"\n"));
        assertEquals(List.of(), parse().plateaus().warnings());
    }
}
