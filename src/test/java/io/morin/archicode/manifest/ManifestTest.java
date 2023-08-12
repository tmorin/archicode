package io.morin.archicode.manifest;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import io.morin.archicode.resource.element.application.Container;
import io.morin.archicode.resource.element.technology.Node;
import io.quarkus.test.junit.QuarkusTest;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.Test;

@QuarkusTest
class ManifestTest {

    static YAMLMapper yamlMapper = YAMLMapper.builder().serializationInclusion(JsonInclude.Include.NON_EMPTY).build();

    @SneakyThrows
    @Test
    void shouldReadResource() {
        val resourceAsString =
            """
                        header:
                          kind: "archicode.morin.io/node"
                          version: "1"
                          parent: "reference.cloudprovider"
                        content:
                          id: "cloudprovider"
                          name: "Cloud Provider"
                          elements:
                            - kind: "node"
                              id: "cluster"
                              name: "Kubernetes Cluster"
                        """;
        val resource = yamlMapper.readValue(resourceAsString, Manifest.class);
        assertEquals(ManifestKind.NODE.getId(), resource.getHeader().getKind());
        assertEquals("1", resource.getHeader().getVersion());
        assertEquals("reference.cloudprovider", resource.getHeader().getParent());
        assertEquals("cloudprovider", resource.getContent().get("id").asText());
        assertEquals("Cloud Provider", resource.getContent().get("name").asText());
        assertEquals("cluster", resource.getContent().withObject("/elements/0").get("id").asText());
        assertEquals("Kubernetes Cluster", resource.getContent().withObject("/elements/0").get("name").asText());
    }

    @SneakyThrows
    @Test
    void shouldConvertSimpleResource() {
        val resourceAsString =
            """
                        header:
                          kind: "archicode.morin.io/node"
                          version: "1"
                          parent: "reference.cloudprovider"
                        content:
                          id: "cloudprovider"
                          name: "Cloud Provider"
                        """;
        val resource = yamlMapper.readValue(resourceAsString, Manifest.class);
        Node node = ManifestConverter.builder().mapper(yamlMapper).manifest(resource).build().convert();
        assertEquals("cloudprovider", node.getId());
    }

    @SneakyThrows
    @Test
    void shouldConvertResourceWithElements() {
        val resourceAsString =
            """
                        header:
                          kind: "archicode.morin.io/container"
                          version: "1"
                          parent: "sol.sys"
                        content:
                          id: "container_a"
                          elements:
                            - kind: "component"
                              id: "component_a"
                        """;
        val resource = yamlMapper.readValue(resourceAsString, Manifest.class);
        Container container = ManifestConverter.builder().mapper(yamlMapper).manifest(resource).build().convert();
        assertEquals("container_a", container.getId());
        assertEquals("component_a", container.getElements().stream().findFirst().orElseThrow().getId());
    }
}
