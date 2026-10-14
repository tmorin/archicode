package io.morin.archicode.rendering.plantuml;

import io.morin.archicode.ViewpointFixtures;
import io.morin.archicode.resource.element.application.Container;
import io.morin.archicode.resource.workspace.Styles;
import java.util.List;
import java.util.Map;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class PlantumlUtilitiesTest {

    @Test
    void shouldListTheStylesByNameWhateverTheOrderTheyAreDeclaredIn() {
        val styles = Styles.builder()
            .byTag("zulu", Styles.Style.builder().lineColor("red").build())
            .byTag("alpha", Styles.Style.builder().lineColor("red").build())
            .byQualifier("Spring Boot", Styles.Style.builder().lineColor("red").build())
            .byQualifier("mike", Styles.Style.builder().lineColor("red").build())
            .build();

        val names = PlantumlUtilities.stereotypeStyles(styles).stream().map(Map.Entry::getKey).toList();

        // the natural order of the names: stable, whatever the maps are
        Assertions.assertEquals(List.of("Spring Boot", "alpha", "mike", "zulu"), names);
    }

    @Test
    void shouldMergeTheTwoMapsForTheSameStereotypeWithTagsOverridingQualifiers() {
        val styles = Styles.builder()
            .byQualifier(
                "database",
                Styles.Style.builder()
                    .backgroundColor("lightgray")
                    .lineColor("blue")
                    .lineThickness(2)
                    .fontColor(" ")
                    .shadowing(true)
                    .build()
            )
            .byTag(
                "database",
                Styles.Style.builder().backgroundColor("white").roundCorner(20).fontColor("black").build()
            )
            .build();

        val entries = PlantumlUtilities.stereotypeStyles(styles);

        Assertions.assertEquals(1, entries.size());
        val style = entries.getFirst().getValue();
        Assertions.assertEquals("white", style.getBackgroundColor(), "the tags win");
        Assertions.assertEquals("blue", style.getLineColor(), "what the tags do not set comes from the qualifiers");
        Assertions.assertEquals(2, style.getLineThickness());
        Assertions.assertEquals(20, style.getRoundCorner());
        Assertions.assertEquals("black", style.getFontColor(), "a blank value is not a value");
        Assertions.assertTrue(style.isShadowing());
    }

    @Test
    void shouldGiveTheSameListEveryTime() {
        val builder = Styles.builder();
        for (int i = 0; i < 50; i++) {
            builder.byTag(
                "tag-" + i,
                Styles.Style.builder()
                    .lineColor("c" + i)
                    .build()
            );
            builder.byQualifier(
                "qualifier-" + i,
                Styles.Style.builder()
                    .lineColor("c" + i)
                    .build()
            );
        }
        val styles = builder.build();

        val first = PlantumlUtilities.stereotypeStyles(styles);

        Assertions.assertEquals(100, first.size());
        Assertions.assertEquals(first, PlantumlUtilities.stereotypeStyles(styles));
        Assertions.assertEquals(
            first.stream().map(Map.Entry::getKey).sorted().toList(),
            first.stream().map(Map.Entry::getKey).toList()
        );
    }

    @Test
    void shouldWriteTheStateOfAComparisonFirstSoThatItWinsOverTheStereotypesTheAuthorWrote() {
        // the kernel ends the stereotypes of a box with its computed state (also when the author wrote the same word);
        // PlantUML lets the first stereotype win, so it is written first, and the kind and the shape stay last
        val element = Container.builder().id("api").build();
        val item = ViewpointFixtures.createItemBuilder(element)
            .stereotypes(List.of("Spring Boot", "external", "changed", "new"))
            .build();

        Assertions.assertEquals(
            "<<new>> <<changed>> <<external>> <<Spring Boot>> <<container>> <<atomic>>",
            PlantumlUtilities.generateStereotypes(item, "container", "atomic")
        );
        val marker = ViewpointFixtures.createItemBuilder(element).stereotypes(List.of("contains-changes")).build();
        Assertions.assertEquals(
            "<<contains-changes>> <<composite>>",
            PlantumlUtilities.generateStereotypes(marker, "composite")
        );
    }
}
