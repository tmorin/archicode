package io.morin.archicode.workspace;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.dataformat.toml.TomlMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import io.morin.archicode.element.application.*;
import io.morin.archicode.element.application.System;
import java.util.Set;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class RawWorkspaceTest {

    TomlMapper tomlMapper;
    YAMLMapper yamlMapper;
    RawWorkspace rawWorkspace;

    @BeforeEach
    @SneakyThrows
    void setUp() {
        tomlMapper = new TomlMapper();
        tomlMapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        yamlMapper = new YAMLMapper();
        yamlMapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        rawWorkspace =
            RawWorkspace
                .builder()
                .application(
                    Application
                        .builder()
                        .elements(Set.of(Solution.builder().id("solution-a").name("Solution #A").build()))
                        .elements(
                            Set.of(
                                ApplicationGroup
                                    .builder()
                                    .id("group")
                                    .name("Group #A")
                                    .elements(
                                        Set.of(
                                            System
                                                .builder()
                                                .id("system-a")
                                                .name("System #A")
                                                .elements(
                                                    Set.of(Container.builder().id("backend").name("Backend #A").build())
                                                )
                                                .build()
                                        )
                                    )
                                    .elements(
                                        Set.of(
                                            System
                                                .builder()
                                                .id("system-a")
                                                .name("System #A")
                                                .elements(
                                                    Set.of(Container.builder().id("backend").name("Backend #A").build())
                                                )
                                                .build()
                                        )
                                    )
                                    .elements(
                                        Set.of(
                                            System
                                                .builder()
                                                .id("system-b")
                                                .name("System #B")
                                                .elements(
                                                    Set.of(
                                                        Container
                                                            .builder()
                                                            .id("backend")
                                                            .name("Backend #B")
                                                            .relationship(
                                                                Relationship.builder().destination("./database").build()
                                                            )
                                                            .relationship(
                                                                Relationship
                                                                    .builder()
                                                                    .destination("/solution-a/group/system-a/backend")
                                                                    .build()
                                                            )
                                                            .build()
                                                    )
                                                )
                                                .elements(
                                                    Set.of(
                                                        Container.builder().id("database").name("Database #B").build()
                                                    )
                                                )
                                                .build()
                                        )
                                    )
                                    .build()
                            )
                        )
                        .build()
                )
                .build();
    }

    @Test
    @SneakyThrows
    void shouldCreateTomlDocument() {
        val workspaceAsToml = tomlMapper.writeValueAsString(rawWorkspace);
        java.lang.System.out.println(workspaceAsToml);
        val newModel = tomlMapper.readValue(workspaceAsToml, RawWorkspace.class);
        assertEquals(rawWorkspace, newModel);
    }

    @Test
    @SneakyThrows
    void shouldCreateYamlDocument() {
        val workspaceAsYaml = yamlMapper.writeValueAsString(rawWorkspace);
        java.lang.System.out.println(workspaceAsYaml);
        val newModel = yamlMapper.readValue(workspaceAsYaml, RawWorkspace.class);
        assertEquals(rawWorkspace, newModel);
    }
}
