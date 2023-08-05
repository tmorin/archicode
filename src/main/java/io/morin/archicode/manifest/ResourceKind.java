package io.morin.archicode.manifest;

import io.morin.archicode.element.application.*;
import io.morin.archicode.element.application.System;
import io.morin.archicode.element.deployment.Deployment;
import io.morin.archicode.element.deployment.Environment;
import io.morin.archicode.element.deployment.Node;
import java.util.*;
import java.util.stream.Collectors;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ResourceKind {
    // APPLICATION
    COMPONENT(Component.class, Application.class),
    CONTAINER(Container.class, Application.class),
    CONTAINER_GROUP(ContainerGroup.class, Application.class),
    PERSON(Person.class, Application.class),
    SOLUTION(Solution.class, Application.class),
    SOLUTION_GROUP(SolutionGroup.class, Application.class),
    SYSTEM(System.class, Application.class),
    SYSTEM_GROUP(SolutionGroup.class, Application.class),
    // DEPLOYMENT
    ENVIRONMENT(Environment.class, Deployment.class),
    NODE(Node.class, Deployment.class);

    private static final Map<String, List<ResourceKind>> INDEX = Arrays
        .stream(ResourceKind.values())
        .collect(Collectors.groupingBy(ResourceKind::getId));
    private final Class<?> type;
    private final Class<?> category;

    public static Optional<ResourceKind> findById(String id) {
        return INDEX.getOrDefault(id, Collections.emptyList()).stream().findFirst();
    }

    public String getId() {
        return "archicode.morin.io/" + this.name().toLowerCase().replace("_", "-");
    }

    public String getSubTypeName() {
        return this.name().toLowerCase().substring(Math.max(this.name().indexOf("_"), 0));
    }
}
