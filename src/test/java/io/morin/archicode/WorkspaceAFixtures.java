package io.morin.archicode;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.databind.MapperFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.cfg.EnumFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import io.morin.archicode.resource.element.application.Application;
import io.morin.archicode.resource.element.application.Relationship;
import io.morin.archicode.resource.element.application.Solution;
import io.morin.archicode.resource.element.application.System;
import io.morin.archicode.resource.view.View;
import io.morin.archicode.resource.workspace.Workspace;
import java.util.Set;
import lombok.experimental.UtilityClass;

@UtilityClass
public class WorkspaceAFixtures {

    static ObjectMapper objectMapper = JsonMapper
        .builder()
        .configure(EnumFeature.WRITE_ENUMS_TO_LOWERCASE, true)
        .enable(MapperFeature.ACCEPT_CASE_INSENSITIVE_ENUMS)
        .serializationInclusion(JsonInclude.Include.NON_EMPTY)
        .build();
    public static final System system_a_a = System
        .builder()
        .id("system_a_a")
        .name("System#A_A")
        .relationships(
            Set.of(
                Relationship.builder().destination("solution_b").label("uses").build(),
                Relationship.builder().destination("solution_c").label("uses").build()
            )
        )
        .build();
    public static final System system_a_b = System
        .builder()
        .id("system_a_b")
        .name("System#A_B")
        .relationships(Set.of(Relationship.builder().destination("solution_b").label("uses").build()))
        .build();
    public static final Solution solution_a = Solution
        .builder()
        .id("solution_a")
        .name("Solution#A")
        .elements(Set.of(system_a_a, system_a_b))
        .relationships(Set.of(Relationship.builder().destination("solution_b").label("uses").build()))
        .build();
    public static final Solution solution_b = Solution
        .builder()
        .id("solution_b")
        .name("Solution#B")
        .description("label of Solution#B")
        .build();
    public static final Solution solution_c = Solution
        .builder()
        .id("solution_c")
        .name("Solution#C")
        .description("label of Solution#C")
        .build();
    public static final View view_solution_a_overview = ResourceFixtures.createOverviewView(
        "view_solution_a_overview",
        "solution_a"
    );
    public static final View view_solution_a_detailed = ResourceFixtures.createDetailedView(
        "view_solution_a_detailed",
        "solution_a"
    );

    public Workspace createWorkspace() {
        return Workspace
            .builder()
            .application(Application.builder().elements(Set.of(solution_a, solution_b, solution_c)).build())
            .view(view_solution_a_overview)
            .view(view_solution_a_detailed)
            .build();
    }
}
