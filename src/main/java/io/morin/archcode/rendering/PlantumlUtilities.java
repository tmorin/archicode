package io.morin.archcode.rendering;

import io.morin.archcode.context.Item;
import io.morin.archcode.context.Link;
import java.util.Optional;
import lombok.experimental.UtilityClass;
import lombok.val;

@UtilityClass
public class PlantumlUtilities {

    public String generateQualifiers(Item item) {
        val buf = new StringBuilder();
        buf.append("[");
        buf.append(item.getKind().name().toLowerCase());

        Optional
            .ofNullable(item.getElement().getQualifiers())
            .map(qualifiers -> String.join(" / ", qualifiers))
            .filter(v -> !v.isBlank())
            .ifPresent(technology -> {
                buf.append(": ");
                buf.append(technology);
            });

        buf.append("]");
        return buf.toString();
    }

    public String generateQualifiers(Link link) {
        val buf = new StringBuilder();
        Optional
            .of(link.getQualifiers())
            .map(qualifiers -> String.join(", ", qualifiers))
            .filter(v -> !v.isBlank())
            .ifPresent(str -> {
                buf.append("[");
                buf.append(str);
                buf.append("]");
            });
        return buf.toString();
    }
}
