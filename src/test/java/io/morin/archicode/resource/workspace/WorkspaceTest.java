package io.morin.archicode.resource.workspace;

import static io.morin.archicode.resource.workspace.Workspace.Utilities.*;
import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.dataformat.toml.TomlMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLMapper;
import io.morin.archicode.resource.element.application.*;
import io.morin.archicode.resource.element.application.System;
import java.util.Set;
import lombok.SneakyThrows;
import lombok.val;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class WorkspaceTest {

    TomlMapper tomlMapper;
    YAMLMapper yamlMapper;
    Workspace workspace;

    @BeforeEach
    @SneakyThrows
    void setUp() {
        tomlMapper = new TomlMapper();
        tomlMapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        yamlMapper = new YAMLMapper();
        yamlMapper.setSerializationInclusion(JsonInclude.Include.NON_NULL);
        workspace = Workspace.builder()
            .application(
                Application.builder()
                    .elements(Set.of(Solution.builder().id("solution-a").name("Solution #A").build()))
                    .elements(
                        Set.of(
                            ApplicationGroup.builder()
                                .id("group")
                                .name("Group #A")
                                .elements(
                                    Set.of(
                                        System.builder()
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
                                        System.builder()
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
                                        System.builder()
                                            .id("system-b")
                                            .name("System #B")
                                            .elements(
                                                Set.of(
                                                    Container.builder()
                                                        .id("backend")
                                                        .name("Backend #B")
                                                        .relationships(
                                                            Set.of(
                                                                Relationship.builder()
                                                                    .destination("./database")
                                                                    .build(),
                                                                Relationship.builder()
                                                                    .destination("/solution-a/group/system-a/backend")
                                                                    .build()
                                                            )
                                                        )
                                                        .build()
                                                )
                                            )
                                            .elements(
                                                Set.of(Container.builder().id("database").name("Database #B").build())
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
        val workspaceAsToml = tomlMapper.writeValueAsString(workspace);
        java.lang.System.out.println(workspaceAsToml);
        val newModel = tomlMapper.readValue(workspaceAsToml, Workspace.class);
        assertEquals(workspace, newModel);
    }

    @Test
    @SneakyThrows
    void shouldCreateYamlDocument() {
        val workspaceAsYaml = yamlMapper.writeValueAsString(workspace);
        java.lang.System.out.println(workspaceAsYaml);
        val newModel = yamlMapper.readValue(workspaceAsYaml, Workspace.class);
        assertEquals(workspace, newModel);
    }

    @Test
    void shouldBeDescendent() {
        assertTrue(isDescendantOf("sol_a.sys_aa.con_aaa", "sol_a.sys_aa"));
    }

    @Test
    void shouldNotBeDescendentWhenSibling() {
        assertFalse(isDescendantOf("sol_a.sys_aa.con_aaa", "sol_a.sys_aa.con_aab"));
    }

    @Test
    void shouldNotBeDescendentWhenNotSameRoot() {
        assertFalse(isDescendantOf("sol_a.sys_aa.con_aaa", "sol_a.sys_ab"));
    }

    @Test
    void shouldBeAncestor() {
        assertTrue(isAncestorOf("sol_a.sys_aa", "sol_a.sys_aa.con_aaa"));
    }

    @Test
    void shouldNotBeAncestorWhenSibling() {
        assertFalse(isAncestorOf("sol_a.sys_aa.con_aaa", "sol_a.sys_aa.con_aab"));
    }

    @Test
    void shouldNotBeAncestorWhenNotSameRoot() {
        assertFalse(isAncestorOf("sol_a.sys_aa.con_aaa", "sol_a.sys_ab"));
    }

    @Test
    void shouldBeSibling() {
        assertTrue(isSiblingOf("sol_a.sys_aa.con_aaa", "sol_a.sys_aa.con_aab"));
    }

    @Test
    void shouldNotBeSiblingWhenDescendant() {
        assertFalse(isSiblingOf("sol_a.sys_aa", "sol_a.sys_aa.con_aaa"));
    }

    @Test
    void shouldNotBeSiblingWhenNotSameRoot() {
        assertFalse(isSiblingOf("sol_a.sys_aa.con_aaa", "sol_a.sys_ab.con_aba"));
    }
}
