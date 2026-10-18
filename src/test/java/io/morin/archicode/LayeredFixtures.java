package io.morin.archicode;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.Map;
import lombok.SneakyThrows;
import lombok.experimental.UtilityClass;
import lombok.val;

/**
 * A small layered workspace, invented, that the tests write into a temporary folder (nothing of it is shipped; the layered
 * Brightcart is another run's). Four plateaus:
 *
 * <pre>
 * baseline  shop (web, api, db, cache), backoffice (console), prod (vm)
 * inhouse   overrides baseline; adds commerce (cart, catalog); five patches: REMOVE shop.cache (the cascade takes three
 *           entries), SET shop.web name, ADD shop.api qualifiers, SET the relationship shop.api -> shop.db, MERGE the tags
 *           of commerce.cart (an element the layer has just added)
 * marketplace overrides inhouse; adds sellers; two patches: a MERGE with a json-path that expects two nodes, and
 *           REMOVE backoffice.console
 * saas      overrides baseline; exists through one header only (no manifest of kind plateau); adds platform
 * </pre>
 *
 * <p>The files are returned as a map, path to text, so that a test can change one before it writes them.
 */
@UtilityClass
public class LayeredFixtures {

    public static final String WORKSPACE = "workspace.yaml";
    public static final String INHOUSE = "plateaus/inhouse/plateau.yaml";
    public static final String MARKETPLACE = "plateaus/marketplace/plateau.yaml";

    private static String manifest(String kind, String plateau, String content) {
        return (
            "header:\n  kind: \"archicode.morin.io/" +
            kind +
            "\"\n  version: \"1\"\n" +
            (plateau == null ? "" : "  plateau: " + plateau + "\n") +
            "content:\n" +
            content
        );
    }

    /** The files of the workspace, in the order they are written. */
    public static Map<String, String> files() {
        val files = new LinkedHashMap<String, String>();
        files.put(
            WORKSPACE,
            """
            settings:
              name: "Layers"
              manifests:
                paths: ["manifests/**", "plateaus/**"]
            """
        );
        files.put(
            "manifests/shop.yaml",
            manifest(
                "system",
                null,
                """
                  id: "shop"
                  name: "Shop"
                  elements:
                    - kind: "container"
                      id: "web"
                      name: "Web storefront"
                      qualifiers: ["React"]
                      relationships:
                        - destination: "shop.api"
                          label: "calls"
                    - kind: "container"
                      id: "api"
                      name: "Shop API"
                      relationships:
                        - destination: "shop.db"
                          label: "stores"
                        - destination: "shop.cache"
                          label: "keeps baskets in"
                    - kind: "container"
                      id: "db"
                      name: "Shop database"
                    - kind: "container"
                      id: "cache"
                      name: "Session cache"
                """
            )
        );
        files.put(
            "manifests/backoffice.yaml",
            manifest(
                "system",
                null,
                """
                  id: "backoffice"
                  name: "Back office"
                  elements:
                    - kind: "container"
                      id: "console"
                      name: "Console"
                      relationships:
                        - destination: "shop.api"
                          label: "reads"
                        - destination: "shop.cache"
                          label: "flushes"
                """
            )
        );
        files.put(
            "manifests/prod.yaml",
            manifest(
                "environment",
                null,
                """
                  id: "prod"
                  name: "Production"
                  elements:
                    - kind: "node"
                      id: "vm"
                      name: "Production VM"
                      applications: ["shop.web", "shop.api", "shop.db", "shop.cache"]
                """
            )
        );
        files.put(
            INHOUSE,
            manifest(
                "plateau",
                null,
                """
                  id: "inhouse"
                  name: "In house"
                  horizon: "2027-Q1"
                  patches:
                    - operator: REMOVE
                      target: shop.cache
                    - operator: SET
                      target: shop.web
                      field: name
                      value: "Web storefront v2"
                    - operator: ADD
                      target: shop.api
                      field: qualifiers
                      value: Java
                    - operator: SET
                      target: shop.api
                      where:
                        destination: shop.db
                        label: stores
                      field: relationships
                      value:
                        label: writes
                    - operator: MERGE
                      target: commerce.cart
                      field: tags
                      value:
                        runtime: quarkus
                """
            )
        );
        files.put(
            "plateaus/inhouse/commerce.yaml",
            manifest(
                "system",
                "inhouse",
                """
                  id: "commerce"
                  name: "Commerce"
                  elements:
                    - kind: "container"
                      id: "cart"
                      name: "Cart"
                      relationships:
                        - destination: "shop.db"
                          label: "keeps baskets in"
                    - kind: "container"
                      id: "catalog"
                      name: "Catalog"
                """
            )
        );
        files.put(
            MARKETPLACE,
            manifest(
                "plateau",
                null,
                """
                  id: "marketplace"
                  name: "Marketplace"
                  horizon: "2028-Q1"
                  override: inhouse
                  patches:
                    - operator: MERGE
                      json-path: "$.application..elements[?(@.id=='cart' || @.id=='catalog')]"
                      expect: 2
                      field: tags
                      value:
                        tier: gold
                    - operator: REMOVE
                      target: backoffice.console
                """
            )
        );
        files.put(
            "plateaus/marketplace/sellers.yaml",
            manifest(
                "system",
                "marketplace",
                """
                  id: "sellers"
                  name: "Sellers"
                  relationships:
                    - destination: "commerce.catalog"
                      label: "publishes to"
                """
            )
        );
        files.put(
            "plateaus/saas/platform.yaml",
            manifest(
                "system",
                "saas",
                """
                  id: "platform"
                  name: "Commerce platform"
                """
            )
        );
        return files;
    }

    /** Write the files below a folder. */
    @SneakyThrows
    public static Path write(Path dir, Map<String, String> files) {
        for (val file : files.entrySet()) {
            val target = dir.resolve(file.getKey());
            Files.createDirectories(target.getParent());
            Files.writeString(target, file.getValue());
        }
        return dir.resolve(WORKSPACE);
    }

    /** Write the workspace of {@link #files()}. */
    public static Path write(Path dir) {
        return write(dir, files());
    }
}
