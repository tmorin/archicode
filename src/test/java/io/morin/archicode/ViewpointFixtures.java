package io.morin.archicode;

import io.morin.archicode.resource.element.Element;
import io.morin.archicode.resource.element.application.Parent;
import io.morin.archicode.viewpoint.Item;
import java.util.stream.Collectors;
import lombok.experimental.UtilityClass;
import lombok.val;

@UtilityClass
public class ViewpointFixtures {

    public Item.ItemBuilder createItemBuilder(Element element) {
        val builder = Item.builder()
            .reference(element.getId())
            .itemId(element.getId())
            .element(element)
            .kind(Item.Kind.from(element));

        if (element instanceof Parent<?> parent) {
            builder.children(
                parent
                    .getElements()
                    .stream()
                    .map(ViewpointFixtures::createItemBuilder)
                    .map(Item.ItemBuilder::build)
                    .collect(Collectors.toSet())
            );
        }

        return builder;
    }

    public Item createItem(Element element) {
        return createItemBuilder(element).build();
    }
}
